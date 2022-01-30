FROM python3.6

WORKDIR /etc/fileserver
COPY files_to_serve/* ./
RUN python -m http.server
