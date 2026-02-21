import os

import uvicorn
from main import app as fastapi_app


def main() -> None:
    port = int(os.getenv('UROFLOW_BACKEND_PORT', '8000'))
    uvicorn.run(fastapi_app, host='127.0.0.1', port=port, log_level='info')


if __name__ == '__main__':
    main()
