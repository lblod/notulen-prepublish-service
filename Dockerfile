FROM semtech/mu-javascript-template:1.5.0-beta.2
LABEL maintainer=info@redpencil.io
# disable logging of sparql queries for performance
ENV LOG_SPARQL_ALL "false"
