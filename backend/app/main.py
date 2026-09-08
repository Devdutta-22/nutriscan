"""
FairPack: LMPC Packaging Compliance & Regulatory RAG Platform.
FastAPI Backend Application Entry Point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.audit import router as audit_router
from app.api.compliance import router as compliance_router
from app.api.gazette import router as gazette_router
from app.api.complaints import router as complaints_router
from app.api.validation import router as validation_router

app = FastAPI(
    title="FairPack API",
    description="Deterministic LMPC Compliance & Gazette RAG Engine",
    version="1.0.0"
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(audit_router, prefix="/api")
app.include_router(compliance_router, prefix="/api")
app.include_router(gazette_router, prefix="/api")
app.include_router(complaints_router, prefix="/api")
app.include_router(validation_router, prefix="/api")

from app.rag.lmpc_corpus import LMPC_CORPUS, CORPUS_VERSION

@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "FairPack Compliance & RAG Engine",
        "version": "2.0.0",
        "corpus_version": CORPUS_VERSION,
        "rules_indexed": len(LMPC_CORPUS)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
