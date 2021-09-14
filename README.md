# Notulen prepublish service
This service can be used to both sign and publish documents generated from information provided in GN. 
To facilitate this it also provides calls to generate a preview of the document as it will be published/signed.

Once a specific document is generated for signing or publication the content is "locked". The prepublish service will always reuse the previously generated document for new signatures or publications. This means that if for example this service is used to sign a decision list, the same generated document will be used for publication even when changes have been made to the linked decisions in the mean time. An exception is the notulen publication, as the notulen publication can remove content it will: TODO verify how it's currently set up.

## generating previews

* `POST /prepublish/agenda/:kindUuid,:zittingIdentifier`: builds a publication from the agenda of a zitting present in the database, and returns it without persisting it
* `POST /prepublish/besluitenlijst/:zittingIdentifier`: returns a publication of an agenda without persisting it.
* `POST /prepublish/behandelingen/:zittingIdentifier`: returns a publication for each "behandeling" linked to the zitting without persisting it, deprecated
* `POST /prepublish/notulen/:documentIdentifier`: returns a publication of a notulen without persisting it.
* `POST /extract-previews`: JSON:API compliant endpoint that creates a preview, expects the following post body
``` json
{
        "data": {
          "type": "extract-preview",
        },
        "relationships": {
          "treatment": {
            "data": {
              "id": "{{treatmentUuid}}",
              "type": "behandeling-van-agendapunt"
            }
          }
      }
}
```
## creating a signed document
* `POST /signing/agenda/sign/:kindUuid/:zittingIdentifier`: persists (if it doesn't exist yet) an agenda publication for :kind and creates a signedResource linked to the agenda.
* `POST /signing/besluitenlijst/sign/:zittingIdentifier`: persists (if it doesn't exist yet) a besluitenlijst publication and creates a signedResource linked to the besluitenlijst.
* `POST /signing/behandeling/sign/:zittingIdentifier/`:behandelingUuid: persists (if it doesn't exist yet) a behandeling publication and creates a signedResource linked to the "behandeling".
* `POST /signing/notulen/sign/:zittingIdentifier`: persists (if it doesn't exist yet) a notulen publication for the provided meeting and creates a signedResource linked to the meeting.

## creating a published document
* `POST /signing/agenda/publish/:kindUuid/:zittingIdentifier`: persists (if it doesn't exist yet) an agenda publication for :kind and creates a publishedResource linked to the agenda.
* `POST /signing/besluitenlijst/publish/:zittingIdentifier`: persists (if it doesn't exist yet) a besluitenlijst publication and creates a publishedResource linked to the besluitenlijst.

* `POST /signing/behandeling/publish/:zittingIdentifier/`:behandelingUuid: persists (if it doesn't exist yet) a behandeling publication and creates a publishedResource linked to the "behandeling".

* `POST /signing/notulen/publish/:documentIdentifier`: persists (if it doesn't exist yet) a notulen publication for :kind and creates a publishedResource linked to the notulen. The request body should contain an array of `behandeling` in the field `public-behandeling-uris` for those agendapoints that can be published in full

## configuration
The following environment variables can be set to configure the service:

  -  *DATE_FORMAT*: datetime format passed to luxon, see the [table of tokens](https://moment.github.io/luxon/docs/manual/formatting.html#table-of-tokens) for more information. Default: `dd/MM/yyyy HH:mm:ss`

## model
The following prefixes are used in the model:
```
"sign": "http://mu.semte.ch/vocabularies/ext/signing/",
"dct": "http://purl.org/dc/terms/",
```
This service creates two types of resources:

### `sign:SignedResource`
The signed resource is a document that has been signed. It has the following properties:
* `sign:text` *: the content of the document that was signed
* `sign:signatory` *: the agent that signed the document
* `sign:signatoryRoles`: the roles the agent had at the moment of signing (the same agent might be able to log into a specific role)
* `dct:created` *: creation date of the signature
* `sign:signatorySecret`: currently unused, a salt added to the hash
* `sign:status`: currently unused, status of the signature
* `dct:subject`: the document that was signed
* `sign:hashValue`: the hash that was calculated when signing the document
* `sign:hashAlgorithm`: the hashing algorithm that was used


Fields denoted with an asterix `*` are used for the hashValue
You can use the following snippet in mu-cl-resources
```lisp
(define-resource signed-resource ()
  :class (s-prefix "sign:SignedResource")
  :properties `((:content :string ,(s-prefix "sign:text"))
                (:hash-value :string ,(s-prefix "sign:hashValue"))
                (:hash-algo :string ,(s-prefix "sign:hashAlgorithm"))
                (:created-on :datetime ,(s-prefix "dct:created")))
)
```
### `sign:PublishedResource`
The published resource is a document as it has been published. The content of the published may be different from the actual document, as senstive information may be removed.

* `sign:text` *: the content of the document as it is published
* `sign:signatory` *: the agent that published the document
* `sign:signatoryRoles`: the roles the agent had at the moment of publishing (the same agent might be able to log into a specific role)
* `dct:created` *: creation date of the publication
* `dct:subject`: the document that was published
* `sign:hashValue`: the hash that was calculated when publishing the document
* `sign:hashAlgorithm`: the hashing algorithm that was used


## development and testing
This service extends nvdk/mu-javascript-template, which is a fork of semtech/mu-javascript-template. For development include the following in your docker-compose.yml:

```
  preimporter:
    image: nvdk/mu-javascript-template
    ports:
      - 9229:9229
    environment:
      NODE_ENV: "development"
      LOG_SPARQL_ALL: "true"
      DEBUG_AUTH_HEADERS: "true"
    volumes:
        - /path/to/notulen-prepublish-service:/app/
```

Running tests can currently be done with the following command:
```
docker run --rm -v `pwd`:/app -e NODE_ENV=test --name foo nvdk/mu-javascript-template
```
## compatibility with frontend-gelinkt-notuleren

For compatibility with frontend-gelinkt-notuleren 1.x use a version < 0.5.x
For compatibility with frontend-gelinkt-notuleren 2.x use a version >= 0.5.x

Note that releases denoted 0.5.x should be considered a work in progress, with an inconsistent api while we are working towards the new publication flow.
