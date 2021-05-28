FROM nvdk/mu-javascript-template
LABEL maintainer=info@redpencil.io
# disable logging of sparql queries for performance
ENV LOG_SPARQL_ALL "false"
