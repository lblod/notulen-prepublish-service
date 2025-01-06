FROM semtech/mu-javascript-template:1.8.0
LABEL maintainer=info@redpencil.io
# disable logging of sparql queries for performance
ENV LOG_SPARQL_ALL "false"
