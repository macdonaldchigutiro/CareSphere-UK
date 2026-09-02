from unittest.mock import Mock

from django.test import SimpleTestCase

from .services.postcode_geo import (
    PostcodeCoordinates,
    bulk_lookup_postcodes,
    is_full_uk_postcode,
    lookup_postcode,
    normalise_postcode,
)


class PostcodeGeoTests(SimpleTestCase):
    def test_normalises_and_recognises_full_postcodes(self):
        self.assertEqual(normalise_postcode(" wd171na "), "WD17 1NA")
        self.assertTrue(is_full_uk_postcode("WD17 1NA"))
        self.assertTrue(is_full_uk_postcode("EC1A 1BB"))
        self.assertFalse(is_full_uk_postcode("WD17"))

    def test_single_lookup_returns_english_coordinates(self):
        response = Mock(status_code=200)
        response.json.return_value = {
            "status": 200,
            "result": {
                "postcode": "WD17 1NA",
                "latitude": 51.655,
                "longitude": -0.396,
                "country": "England",
            },
        }
        session = Mock()
        session.get.return_value = response

        result = lookup_postcode("wd171na", session=session)

        self.assertEqual(
            result,
            PostcodeCoordinates("WD17 1NA", 51.655, -0.396, "England"),
        )
        session.get.assert_called_once()

    def test_bulk_lookup_ignores_unresolved_and_non_english_results(self):
        response = Mock(status_code=200)
        response.json.return_value = {
            "status": 200,
            "result": [
                {
                    "query": "WD17 1NA",
                    "result": {
                        "postcode": "WD17 1NA",
                        "latitude": 51.655,
                        "longitude": -0.396,
                        "country": "England",
                    },
                },
                {"query": "W1A 1AA", "result": None},
                {
                    "query": "CF10 1EP",
                    "result": {
                        "postcode": "CF10 1EP",
                        "latitude": 51.481,
                        "longitude": -3.179,
                        "country": "Wales",
                    },
                },
            ],
        }
        session = Mock()
        session.post.return_value = response

        results = bulk_lookup_postcodes(
            ["WD17 1NA", "W1A 1AA", "CF10 1EP"],
            session=session,
        )

        self.assertEqual(list(results), ["WD17 1NA"])
        self.assertEqual(results["WD17 1NA"].country, "England")
        self.assertEqual(
            session.post.call_args.kwargs["params"]["filter"],
            "postcode,longitude,latitude,country",
        )
        self.assertEqual(
            session.post.call_args.kwargs["json"],
            {"postcodes": ["WD17 1NA", "W1A 1AA", "CF10 1EP"]},
        )
