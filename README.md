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
