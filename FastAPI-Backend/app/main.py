from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from google.auth import credentials
from google.oauth2 import service_account
import google.cloud.aiplatform as aiplatform
from vertexai.preview.language_models import CodeGenerationModel
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
import vertexai
import json 
import os
import openai
from pydantic import BaseModel
from typing import Optional, List

# Load the service account json file
# Update the values in the json file with your own
with open(
    "service_account.json"
) as f:  # replace 'serviceAccount.json' with the path to your file if necessary
    service_account_info = json.load(f)

with open("openai.json") as f:
    openai_json = json.load(f)
    print("openai_json: ", openai_json)
    openai.api_key = openai_json["api_key"]

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


class Item(BaseModel):
    prompt: str
    temperature: float = 0.5
    data: Optional[List[str]]

@app.post("/code")
async def generate_code(item: Item):
    """
    Endpoint to handle code generation.
    Receives a message from the user, processes it, and returns a response from the model.
    """
    temperature = item.temperature
    prompt = item.prompt
    parameters = {
        "temperature": temperature,  # Temperature controls the degree of randomness in token selection.
        "max_output_tokens": 2048,  # Token limit determines the maximum amount of text output.
    }

    dataPrompt = ""
    if (item.data is not None):
        data = item.data
        allData = ''.join(data)
        if "X =" in allData and "y =" in allData:
            exec(allData, globals())
            dataPrompt = f"The code should be compatible with input shape {X.shape[1:]} and output shape {y.shape[1:]}."


    content = f"Please write me pytorch code to {prompt}.Please only give code, and no comments, examples, or explanations. {dataPrompt}"

    print("content: ", content)
    # Call the model
    response = llm_inference(parameters, content)

    # Return the model's response
    return {"response": response, "data": item.data}

@app.post("/summarize")
async def summarize_code(item: Item):
    """
    Endpoint to handle code summarization.
    Receives a message from the user, processes it, and returns a response from the model.
    """
    temperature = item.temperature
    prompt = item.prompt
    parameters = {
        "temperature": temperature,  # Temperature controls the degree of randomness in token selection.
        "max_output_tokens": 100,  # Token limit determines the maximum amount of text output.
    }
    content = f"Please write a markdown title for pytorch code in {prompt}."

    # Call the model
    response = llm_inference(parameters, content)

    # Return the model's response
    return {"response": response}

def llm_google(parameters, prompt):
    code_generation_model = CodeGenerationModel.from_pretrained("code-bison@001")
    response = code_generation_model.predict(
        prefix=prefix, **parameters
    )
    return response.text

def llm_inference(parameters, content):
    response = openai.ChatCompletion.create(
        # model="gpt-4",
        model="gpt-3.5-turbo",
        messages=[
            {
            "role": "user",
            "content": content,
            }
        ],
        temperature=parameters["temperature"],
        max_tokens=1024,
        top_p=1,
        frequency_penalty=0,
        presence_penalty=0
    )
    return response
