# CQC directory import

CareSphere discovery combines registered CareSphere providers with relevant
locations from the public [CQC care directory](https://www.cqc.org.uk/about-us/transparency/using-cqc-data).
The external data remains separate in `ExternalProviderLocation`; it does not
create CareSphere accounts, availability, prices, bookings or verification.

## Import scope

The importer reads the real CQC columns, including `Service types`,
`Specialisms/services`, `CQC Location ID` and `CQC Provider ID`. It deliberately
keeps only categories that map cleanly to the current CareSphere adult-care
scope:

| CQC service type | CareSphere care type |
| --- | --- |
| Homecare agencies | Domiciliary |
| Residential homes | Residential |
| Nursing homes | Nursing |
| Supported living | Specialist |
| Supported housing | Specialist |
| Shared lives | Specialist |
| Hospice / Home hospice care | Specialist |

Dentists, GPs, hospitals, ambulances, clinics and other unrelated regulated
services are excluded. A location explicitly marked only for children is also
excluded. A whitelisted social-care location without an age-band value is kept,
because some valid CQC directory rows omit that metadata.

The implementation was validated against the CQC snapshot dated 26 August
2026: 57,082 rows were read, 30,819 relevant locations were selected and 26,263
unrelated or child-only rows were excluded.

## Run an import

Download the latest CQC care directory CSV, then run migrations and a dry run:

```powershell
cd caresphere_backend
python manage.py migrate
python manage.py import_cqc_locations "C:\path\to\CQC_directory.csv" --dry-run
```

Review the counts, then write the snapshot:

```powershell
python manage.py import_cqc_locations "C:\path\to\CQC_directory.csv"
```

The command validates the schema, normalises text, postcodes, URLs and CQC
dates, deduplicates in memory, then bulk-upserts by the unique CQC Location ID.
Running the same file again is safe and produces unchanged records rather than
duplicates.

For a complete replacement snapshot, stale rows can be hidden from discovery:

```powershell
python manage.py import_cqc_locations "C:\path\to\CQC_directory.csv" --deactivate-missing
```

That option cannot be combined with `--limit` and refuses snapshots containing
fewer than 1,000 relevant locations by default. This protects the index from a
partial or damaged file. Use `--minimum-relevant-rows` only when deliberately
importing a smaller complete dataset.

## Discovery API

The public endpoint is:

```text
GET /api/care-providers/discovery/
```

Supported query parameters include `q`, `source`, `care_type`, `postcode`,
`region`, `verification`, `cqc_rating`, `funding`, `page` and `page_size`.
Results use one card-friendly shape and include `source`, `can_save` and
`can_book` flags. CQC-directory rows have both flags set to `false` and link to
the official CQC location page.

## Attribution

CQC data is available under the
[Open Government Licence](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
The Find Care interface includes the required CQC attribution and directs users
to the official profile for the latest details.
