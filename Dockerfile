FROM semtech/mu-javascript-template:feature-dev-experience-tryouts
LABEL maintainer=info@redpencil.io
# disable logging of sparql queries for performance
ENV LOG_SPARQL_ALL "false"
