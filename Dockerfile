FROM semtech/mu-javascript-template:feature-seperate-server-start
LABEL maintainer=info@redpencil.io
# disable logging of sparql queries for performance
ENV LOG_SPARQL_ALL "false"
