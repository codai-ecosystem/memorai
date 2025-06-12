#!/usr/bin/env python3
"""
Local AI Setup Script for Memorai
Installs sentence-transformers and downloads the embedding model
"""

import sys
import subprocess
import json
import os

def run_command(cmd, description):
    """Run a command and handle errors gracefully"""
    print(f"[INFO] {description}...")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"[SUCCESS] {description} completed successfully")
            return True
        else:
            print(f"[ERROR] {description} failed:")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"[ERROR] {description} failed with error: {e}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major >= 3 and version.minor >= 8:
        print(f"[SUCCESS] Python {version.major}.{version.minor}.{version.micro} is compatible")
        return True
    else:
        print(f"[ERROR] Python {version.major}.{version.minor}.{version.micro} is not compatible. Need Python 3.8+")
        return False

def install_sentence_transformers():
    """Install sentence-transformers package"""
    return run_command(
        "pip install sentence-transformers",
        "Installing sentence-transformers"
    )

def download_model():
    """Download and cache the embedding model"""
    model_script = '''
import json
from sentence_transformers import SentenceTransformer

try:
    print("[INFO] Downloading embedding model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Test the model
    print("[INFO] Testing model...")
    test_embedding = model.encode("This is a test sentence.")
    
    print(f"[SUCCESS] Model loaded successfully! Embedding dimension: {len(test_embedding)}")
    
    # Output model info
    result = {
        "model": "all-MiniLM-L6-v2",
        "dimension": len(test_embedding),
        "status": "ready"
    }
    print(json.dumps(result))
    
except Exception as e:
    print(f"[ERROR] Model download failed: {e}")
    result = {
        "status": "error",
        "error": str(e)
    }
    print(json.dumps(result))
'''
      # Write temp script
    with open("temp_model_test.py", "w", encoding='utf-8') as f:
        f.write(model_script)
    
    try:
        success = run_command(
            "python temp_model_test.py",
            "Downloading and testing embedding model"
        )
        return success
    finally:
        # Clean up temp file
        if os.path.exists("temp_model_test.py"):
            os.remove("temp_model_test.py")

def main():
    """Main setup function"""
    print("*** Memorai Local AI Setup")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install dependencies
    if not install_sentence_transformers():
        print("[ERROR] Failed to install sentence-transformers")
        sys.exit(1)
    
    # Download model
    if not download_model():
        print("[ERROR] Failed to download embedding model")
        sys.exit(1)
    
    print("\n[SUCCESS] Local AI setup completed successfully!")
    print("[INFO] Memorai can now run with local embeddings (Tier 2 - Smart Memory)")
    print("\n[INFO] Tips:")
    print("  • Set PYTHON_PATH environment variable if Python is not in PATH")
    print("  • The model will be cached locally for future use")
    print("  • Fallback to keyword search (Tier 3) if local AI fails")

if __name__ == "__main__":
    main()
