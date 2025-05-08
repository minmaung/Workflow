# Simple test script to run the API directly
import uvicorn
from main_updated import app

if __name__ == "__main__":
    print("Starting server with app imported directly from main_updated")
    uvicorn.run(app, host="0.0.0.0", port=8080)
