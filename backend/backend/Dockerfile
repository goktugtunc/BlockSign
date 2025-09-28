FROM --platform=linux/amd64 python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

RUN pip install pipx
RUN pipx ensurepath

RUN pipx install algokit
RUN pip install --no-cache-dir --upgrade py-algorand-sdk


COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]