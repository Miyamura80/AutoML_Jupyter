import nbformat
from nbconvert.preprocessors.execute import ExecutePreprocessor
from nbclient.exceptions import CellExecutionError, DeadKernelError
import copy



notebook_filename = 'new_test.ipynb'
notebook_filename_out = 'executed_new_test.ipynb'

# Load the notebook
with open(notebook_filename) as f:
    nb = nbformat.read(f, as_version=4)



resources = {'metadata': {'path': './'}}
ep = ExecutePreprocessor(timeout=600, kernel_name='python3')

def refine_cell(error_msg: str, original_cell: str) -> str:
    prompt = f"I would like to fix the following code. Please just give me the fixed version of this code, without any explanations or comments. \n {original_cell} \n for which I get the following error: \n {error_msg}"
    print("PROMPT: ", prompt)
    return "print(\"fixed\")"

for index, cell in enumerate(nb.cells):
    if cell.cell_type == "code":
        try:
            copied_nb = copy.deepcopy(nb)
            # Remove cells after cell i from the copied notebook
            copied_nb['cells'] = copied_nb['cells'][:index+1]

            out, resources = ep.preprocess(copied_nb, resources)
        except Exception as e:
            # print(e)
            nb.cells[index].source = refine_cell(str(e), nb.cells[index].source)
            



with open(f"notebooks/{notebook_filename_out}", mode='w', encoding='utf-8') as f:
    nbformat.write(nb, f)

print("finished execution")