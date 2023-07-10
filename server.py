import nbformat
from notebook.notebookapp import list_running_servers
import requests
import json

# Launch your Jupyter server first.
server_info = next(list_running_servers())

# Parse the .ipynb file.
with open("new_test.ipynb") as f:
    nb = nbformat.read(f, as_version=4)

# Identify the cell to execute.
cell_to_execute = nb.cells[0]  # for example

# Execute the code in the cell.
session_url = server_info['url'] + 'api/sessions'
headers = {'Authorization': 'token ' + server_info['token']}
session = json.loads(requests.get(session_url, headers=headers).text)[0]
requests.post(
    server_info['url'] + 'api/sessions/' + session['id'] + 'execute',
    headers=headers,
    data=json.dumps({
        'code': cell_to_execute.source,
        'silent': False,
        'store_history': True,
        'user_expressions': {},
        'allow_stdin': False
    })
)
