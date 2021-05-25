# Notulen prepublish service
This service acts on document containers. Provides the following calls:

- `/prepublish/agenda/:zittingIdentifier`: builds a publication from the agenda of a zitting present in the database, and returns it without persisting it
- `/signing/agenda/sign/:kind/:zittingIdentifier`:  persists (if it doesn't exist yet) an agenda publication for :kind and creates a signedResource linked to the agenda.
- `/signing/agenda/publish/:kind/:zittingIdentifier`:  persists  (if it doesn't exist yet) an agenda publication for :kind and creates a publishedResource linked to the agenda.

- `/prepublish/behandelingen/:zittingIdentifier`: returns a publication for each "behandeling" linked to the zitting without persisting it.
- `/signing/behandeling/sign/:zittingIdentifier/:behandelingUuid`: persists (if it doesn't exist yet) a behandeling publication and creates a signedResource linked to the "behandeling".
- `/signing/behandeling/publish/:zittingIdentifier/:behandelingUuid`: persists (if it doesn't exist yet) a behandeling publication and creates a publishedResource linked to the "behandeling".

- `/prepublish/besluitenlijst/:zittingIdentifier`: returns a publication of an agenda without persisting it.
- `/signing/besluitenlijst/sign/:zittingIdentifier`:  persists (if it doesn't exist yet) a besluitenlijst publication and creates a signedResource linked to the besluitenlijst.
- `/signing/besluitenlijst/publish/:zittingIdentifier`:  persists  (if it doesn't exist yet) an besluitenlijst publication and creates a publishedResource linked to the besluitenlijst.

- `/prepublish/notulen/:documentIdentifier`: returns a publication of a notulen without persisting it.
- `/signing/notulen/sign/:kind/:documentIdentifier`:  persists (if it doesn't exist yet) a notulen publication for :kind and creates a signedResource linked to the notulen.
- `/signing/notulen/publish/:kind/:documentIdentifier`:  persists  (if it doesn't exist yet) a notulen publication for :kind and creates a publishedResource linked to the notulen.

## compatibility with frontend-gelinkt-notuleren

For compatibility with frontend-gelinkt-notuleren 1.x use a version < 0.5.x
For compatibility with frontend-gelinkt-notuleren 2.x use a version >= 0.5.x

Note that releases denoted 0.5.x should be considered a work in progress, with an inconsistent api while we are working towards the new publication flow.

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

