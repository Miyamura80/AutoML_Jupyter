from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from google.auth import credentials
from google.oauth2 import service_account
import google.cloud.aiplatform as aiplatform
from vertexai.preview.language_models import CodeGenerationModel
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
import vertexai
import json 

# Load the service account json file
# Update the values in the json file with your own
with open(
    "service_account.json"
) as f:  # replace 'serviceAccount.json' with the path to your file if necessary
    service_account_info = json.load(f)

my_credentials = service_account.Credentials.from_service_account_info(
    service_account_info
)

# Initialize Google AI Platform with project details and credentials
aiplatform.init(
    credentials=my_credentials,
)

with open("service_account.json", encoding="utf-8") as f:
    project_json = json.load(f)
    project_id = project_json["project_id"]


# Initialize Vertex AI with project and location
vertexai.init(project=project_id, location="us-central1")

# Initialize the FastAPI application
app = FastAPI()

# Configure CORS for the application
origins = ["http://localhost", "http://localhost:8080", "http://localhost:3000"]
origin_regex = r"https://(.*\.)?alexsystems\.ai"
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint that returns available endpoints in the application"""
    return {
        "Endpoints": {
            "code": "/code",
        }
    }


@app.get("/docs")
async def get_documentation():
    """Endpoint to serve Swagger UI for API documentation"""
    return get_swagger_ui_html(openapi_url="/openapi.json", title="docs")


@app.get("/redoc")
async def get_documentation():
    """Endpoint to serve ReDoc for API documentation"""
    return get_redoc_html(openapi_url="/openapi.json", title="redoc")


@app.post("/code")
async def generate_code(prompt: str, temperature: float = 0.5):
    """
    Endpoint to handle code generation.
    Receives a message from the user, processes it, and returns a response from the model.
    """
    parameters = {
        "temperature": temperature,  # Temperature controls the degree of randomness in token selection.
        "max_output_tokens": 2048,  # Token limit determines the maximum amount of text output.
    }

    # === Pre processing ===

    # Add a prefix
    prefix = "Write a pytorch model of the following description. Only output code.\n"

    # ======================

    code_generation_model = CodeGenerationModel.from_pretrained("code-bison@001")
    response = code_generation_model.predict(
        prefix=prefix, **parameters
    )

    # === Post processing ===

    # Only get the text between "```python" and "```"
    response_text = response.text.split("```python")[1].split("```")[0]

    # =======================

    # Return the model's response
    return {"response": response_text}
