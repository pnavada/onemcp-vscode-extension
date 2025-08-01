Please write a shell script that will install and run the MCP server available at `{REPOSITORY_URL_USING_HTTPS}`.

The script should include at least the following steps:
* Install git
* Clone the repository containing the MCP server's code
* Install python3, pip, and python3-venv
* Create a python3 virtual environment
* Activate the python3 virtual environment
* Follow the instructions in the README file to install and configure the MCP server
* Launch the MCP server according to the README file's instructions

Assume you're running in a Docker container on Ubuntu 24.04. So, for instance, you don't need to use `sudo`.

Here are the contents of the README file:

```
{CONTENTS_OF_README_FILE}
```
