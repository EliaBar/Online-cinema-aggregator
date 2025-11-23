import unittest
import json
# Імпортуємо функції з вашого core.py
from core import normalize_title, similarity, parse_megogo_options, parse_sweettv_options

class TestParserCore(unittest.TestCase):
    def test_normalize_title_basic(self):
        self.assertEqual(normalize_title("The Matrix"), "the matrix")

    def test_normalize_title_punctuation(self):
        self.assertEqual(normalize_title('Dune: Part Two (2024)'), "dune part two")
        self.assertEqual(normalize_title('"Barbie"'), "barbie")

    def test_normalize_title_none(self):
        self.assertIsNone(normalize_title(None))
        self.assertIsNone(normalize_title(""))


    def test_similarity_exact(self):
        self.assertEqual(similarity("Avatar", "Avatar"), 1.0)

    def test_similarity_case_insensitive(self):
        self.assertEqual(similarity("avatar", "AVATAR"), 1.0)

    def test_similarity_different(self):
        score = similarity("Batman", "Superman")
        self.assertLess(score, 0.5)

    def test_similarity_partial(self):
        score = similarity("Harry Potter 1", "Harry Potter")
        self.assertGreater(score, 0.8)

    def test_parse_megogo_free(self):
        res = parse_megogo_options(1, 1, "[]")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0][2], "Безкоштовно")

    def test_parse_megogo_purchase(self):
        json_data = json.dumps([{"type": "Покупка", "price": "100", "quality": "HD"}])
        res = parse_megogo_options(1, 1, json_data)
        self.assertEqual(res[0][2], "Покупка (HD)")
        self.assertEqual(res[0][3], 100.0)


    def test_parse_sweettv_subscription(self):
        json_data = json.dumps({"L": "150 грн"})
        res = parse_sweettv_options(1, 2, json_data)
        self.assertEqual(res[0][2], "Підписка (L)")
        self.assertEqual(res[0][3], 150.0)

    def test_parse_sweettv_purchase(self):
        json_data = json.dumps({"Покупка": {"SD": "100 грн"}})
        res = parse_sweettv_options(1, 2, json_data)
        self.assertEqual(res[0][2], "Покупка (SD)")
        self.assertEqual(res[0][3], 100.0)

if __name__ == '__main__':
    unittest.main()