FROM python:3.9-slim-bullseye

WORKDIR /etc/fileserver
COPY files_to_serve/* ./
RUN python -m http.server
