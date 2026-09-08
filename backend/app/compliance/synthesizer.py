"""
Audit Synthesizer: Integrates deterministic calculations, Big-8+ verification,
hybrid RAG statutory retrieval, and optional Gemini-powered compliance reasoning
into a complete LMPC compliance audit report.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from app.compliance.big8_checker import Big8Checker
from app.compliance.math_engine import DeterministicMathEngine
from app.rag.gazette_db import lmpc_retrieval_engine
from app.rag.gemini_engine import gemini_engine
from app.config import Settings

logger = logging.getLogger(__name__)

class AuditSynthesizer:
    
    @classmethod
    def _enrich_with_rag(cls, checklist_item: Dict, product_category: str) -> tuple:
        """Returns (enriched_item, retrieved_chunks) for a single checklist item."""
        citation_key = checklist_item.get('citation_key') or checklist_item.get('id', '')
        query = checklist_item.get('item', '') + ' ' + product_category
        
        chunks = []
        gazette_citation = {}
        
        if citation_key:
            # 1. Try direct lookup
            direct_chunk = lmpc_retrieval_engine.get_by_id(citation_key)
            if direct_chunk:
                chunks.append(direct_chunk)
            else:
                # 2. Semantic search
                search_results = lmpc_retrieval_engine.search(query, top_k=2)
                chunks.extend(search_results)
                if search_results:
                    direct_chunk = search_results[0]
            
            if direct_chunk:
                # 3. Fetch related rules
                related_rules = lmpc_retrieval_engine.get_related_rules(citation_key)
                # 4. Fetch penalty info
                penalty_chunk = lmpc_retrieval_engine.get_penalty_for_rule(citation_key)
                if penalty_chunk and isinstance(penalty_chunk, dict):
                    penalty_str = penalty_chunk.get('title') or f"{penalty_chunk.get('id', 'Rule 32')} - General Penalty"
                else:
                    penalty_str = "Rule 32 - General Penalty (Fine up to ₹25,000)"

                # Safe string list for related rules
                safe_related = [
                    r.get('id') if isinstance(r, dict) else str(r)
                    for r in (related_rules or [])
                ]
                
                gazette_citation = {
                    "rule": direct_chunk.get('title') or direct_chunk.get('id'),
                    "gazette_ref": direct_chunk.get('gazette_ref', 'G.S.R. 202(E)'),
                    "verbatim_clause": direct_chunk.get('verbatim_text') or direct_chunk.get('content', ''),
                    "officer_guidance": direct_chunk.get('officer_guidance', ''),
                    "penalty_rule": penalty_str,
                    "effective_date": direct_chunk.get('effective_date', ''),
                    "amendment_refs": direct_chunk.get('amendment_refs', []) or direct_chunk.get('amendments', []),
                    "related_rules": safe_related
                }
        
        enriched_item = dict(checklist_item)
        if gazette_citation:
            enriched_item['gazette_citation'] = gazette_citation
            
        return enriched_item, chunks

    @classmethod
    def synthesize_report(cls, product_name: str, label_data: Dict[str, Any], tokens: Optional[List[Dict[str, Any]]] = None, image_metadata: Optional[Dict[str, Any]] = None, product_category: str = 'general') -> Dict[str, Any]:
        """Synchronous deterministic-only synthesis (always works, no API key needed)."""
        logger.info(f"Synthesizing sync report for {product_name}")
        
        big8_result = Big8Checker.evaluate(label_data)
        
        enriched_checklist = []
        all_chunks = []
        
        for item in big8_result.get('checklist', []):
            enriched_item, chunks = cls._enrich_with_rag(item, product_category)
            enriched_checklist.append(enriched_item)
            all_chunks.extend(chunks)
            
        return cls._compile_report(
            product_name=product_name,
            product_category=product_category,
            big8_result=big8_result,
            enriched_checklist=enriched_checklist,
            all_chunks=all_chunks,
            gemini_result=None,
            tokens=tokens,
            image_metadata=image_metadata,
            label_data=label_data
        )

    @classmethod
    async def synthesize_report_with_llm(cls, product_name: str, label_data: Dict[str, Any], tokens: Optional[List[Dict[str, Any]]] = None, image_metadata: Optional[Dict[str, Any]] = None, product_category: str = 'general') -> Dict[str, Any]:
        """Async synthesis with optional Gemini LLM reasoning."""
        logger.info(f"Synthesizing async LLM report for {product_name}")
        
        # 1. Run Big-8+ Checker
        big8_result = Big8Checker.evaluate(label_data)
        
        # 2. Enrich with RAG
        enriched_checklist = []
        all_chunks = []
        
        for item in big8_result.get('checklist', []):
            enriched_item, chunks = cls._enrich_with_rag(item, product_category)
            enriched_checklist.append(enriched_item)
            all_chunks.extend(chunks)
            
        # Deduplicate chunks
        unique_chunks = []
        seen = set()
        for chunk in all_chunks:
            cid = chunk.get('id')
            if cid and cid not in seen:
                seen.add(cid)
                unique_chunks.append(chunk)
                
        # 3. Gemini LLM Synthesis
        gemini_result = None
        try:
            gemini_result = await gemini_engine.analyze_compliance(label_data, unique_chunks, product_name)
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            
        if gemini_result and 'findings' in gemini_result:
            findings_map = {}
            for f in gemini_result.get('findings', []):
                fid = f.get('mandate_id') or f.get('id') or f.get('item_id')
                if fid:
                    findings_map[fid] = f
            
            for item in enriched_checklist:
                item_id = item.get('mandate_id') or item.get('id')
                if item_id in findings_map:
                    finding = findings_map[item_id]
                    item['llm_reasoning'] = finding.get('reasoning') or finding.get('llm_reasoning')
                    item['verbatim_citation'] = finding.get('verbatim_citation')
                    item['corrective_action'] = finding.get('corrective_action')
                    
                    # LLM can upgrade severity, not downgrade
                    orig_status = item.get('status', 'COMPLIANT')
                    llm_status = finding.get('status', 'COMPLIANT')
                    
                    if orig_status != 'VIOLATION' and llm_status == 'VIOLATION':
                        item['status'] = 'VIOLATION'
                    elif orig_status == 'COMPLIANT' and llm_status == 'WARNING':
                        item['status'] = 'WARNING'
                        
        return cls._compile_report(
            product_name=product_name,
            product_category=product_category,
            big8_result=big8_result,
            enriched_checklist=enriched_checklist,
            all_chunks=all_chunks,
            gemini_result=gemini_result,
            tokens=tokens,
            image_metadata=image_metadata,
            label_data=label_data
        )

    @classmethod
    def _compile_report(cls, product_name, product_category, big8_result, enriched_checklist, all_chunks, gemini_result, tokens, image_metadata, label_data=None):
        
        violations_count = 0
        warnings_count = 0
        compliant_count = 0
        
        violations_list = []
        warnings_list = []
        
        for item in enriched_checklist:
            status = item.get('status', 'OK')
            if status == 'VIOLATION':
                violations_count += 1
                violations_list.append(item)
            elif status == 'WARNING':
                warnings_count += 1
                warnings_list.append(item)
            else:
                compliant_count += 1
                
        is_small_pack = big8_result.get("is_small_pack_exempt", False)

        if violations_count > 0:
            legal_status = "NON_COMPLIANT_VIOLATION"
            status_text = "Violation of Rule 32 of LMPC Rules, 2011"
        elif warnings_count > 0:
            legal_status = "COMPLIANT_WITH_WARNINGS"
            status_text = "Compliant but with warnings related to LMPC Rules"
        elif is_small_pack:
            legal_status = "FULLY_COMPLIANT"
            status_text = "Statutorily Exempt under Rule 26(a) (Net Qty ≤ 10g). All applicable small-pack requirements met."
        else:
            legal_status = "FULLY_COMPLIANT"
            status_text = "Fully Compliant with Rule 32 of LMPC Rules, 2011"
            
        score = max(0, 100 - (violations_count * 20) - (warnings_count * 5))
        
        unique_rules_cited = len(set(c.get('id') for c in all_chunks if c.get('id')))
        
        # Safe config fallback
        try:
            corpus_version = Settings.CORPUS_VERSION
        except AttributeError:
            corpus_version = "2024.1"
        
        report = {
            "audit_id": f"FP-{datetime.utcnow().strftime('%Y%m%d')}-{abs(hash(product_name)) % 10000:04d}",
            "audit_timestamp": datetime.utcnow().isoformat() + "Z",
            "product_name": product_name,
            "product_category": product_category,
            "legal_status": legal_status,
            "status_text": status_text,
            "compliance_score": score,
            "corpus_version": corpus_version,
            "llm_enhanced": bool(gemini_result),
            "is_small_pack_exempt": is_small_pack,
            "summary": {
                "total_mandates_checked": len(enriched_checklist),
                "compliant_count": compliant_count,
                "warnings_count": warnings_count,
                "violations_count": violations_count,
                "is_lawful_for_sale": violations_count == 0,
                "is_small_pack_exempt": is_small_pack,
                "exemption_rule": "Rule 26(a) - Small Package Exemption (≤ 10g)" if is_small_pack else None
            },
            "checklist": enriched_checklist,
            "usp_verification": big8_result.get("usp_verification", {}),
            "violations": violations_list,
            "warnings": warnings_list,
            "gemini_analysis": gemini_result or None,
            "tokens": tokens or [],
            "image_metadata": image_metadata or {"width": 800, "height": 600},
            "label_data": label_data or {},
            "barcode_data": big8_result.get("barcode_data"),
            "qr_data": big8_result.get("qr_data"),
            "packaging_symbols": big8_result.get("packaging_symbols"),
            "rag_retrieval_stats": {
                "total_chunks_retrieved": len(all_chunks),
                "unique_rules_cited": unique_rules_cited,
                "corpus_version": corpus_version
            }
        }
        return report
