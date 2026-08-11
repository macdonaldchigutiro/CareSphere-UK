#!/bin/bash

# Generate SSL certificates for CareSphere UK
# Run this script to generate self-signed certificates for development

echo "Generating SSL certificates for CareSphere UK..."

# Create SSL directory if it doesn't exist
mkdir -p ../ssl

# Generate private key
openssl genrsa -out ../ssl/caresphere.key 2048

# Generate CSR
openssl req -new -key ../ssl/caresphere.key -out ../ssl/caresphere.csr \
  -subj "/C=GB/ST=England/L=London/O=CareSphere UK/CN=caresphere.uk"

# Generate self-signed certificate
openssl x509 -req -days 365 -in ../ssl/caresphere.csr \
  -signkey ../ssl/caresphere.key -out ../ssl/caresphere.crt

# Generate wildcard certificate
openssl req -new -key ../ssl/caresphere.key -out ../ssl/wildcard.csr \
  -subj "/C=GB/ST=England/L=London/O=CareSphere UK/CN=*.caresphere.uk"

openssl x509 -req -days 365 -in ../ssl/wildcard.csr \
  -signkey ../ssl/caresphere.key -out ../ssl/wildcard.crt

# Generate DH parameters for stronger security
openssl dhparam -out ../ssl/dhparam.pem 2048

# Set proper permissions
chmod 600 ../ssl/caresphere.key
chmod 644 ../ssl/caresphere.crt

echo "SSL certificates generated successfully!"
echo "Files created in docker/ssl/:"
echo "  - caresphere.key (private key)"
echo "  - caresphere.crt (certificate)"
echo "  - caresphere.csr (certificate signing request)"
echo "  - wildcard.crt (wildcard certificate)"
echo "  - dhparam.pem (DH parameters)"