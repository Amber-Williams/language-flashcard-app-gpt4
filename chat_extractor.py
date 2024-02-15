import json

import openai


class ChatExtractor:
    def __init__(self, model_key=None, model=None, max_tokens=500):
        if model_key:
            self.model_key = model_key
        else:
            raise ValueError("No OpenAI API key provided")
        if model:
            self.model = model
        else:
            raise ValueError("No OpenAI API model provided")
        self.max_tokens = max_tokens
        self.model = model
        self.system_role = """You are a helpful language teaching assistant designed to output JSON."""

    def extract(self, description, db_words, language):
        try:
            string_template = f"""Give 5 words written in {language} that are around the topic: {description}, \
            accompanied with its correct English translation and three incorrect translations
            that are realistic and relevant to the correct answer.
            Also give me the English translation of the word, and present the word within the context
            of an {language} sentence, and also provide its English translation. Do not provide words that are
            the same in both languages. Only provide words that are relevant to the topic.

            Do NOT include these words that are already in the database, BUT they CAN be used as incorrect options:
            {db_words}

            Instructions:
            1. Format the output as JSON with the data represented as an array of dictionaries with the following keys:
            "word": str // {language} word
            "incorrect_options": List[str] // Incorrect English translations
            "english": str // English translation of the {language} word
            "sentenceLANG": str // Example sentence in {language} using the word
            "sentenceEN": str // English translation of the example sentence
            2. Ensure to return JSON parsable output.
            """
     
            content = json.dumps(string_template)
        except Exception:
            print(f"Couldn't convert to JSON")
            raise

        openai.api_key = self.model_key
        response = openai.ChatCompletion.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.system_role},
                {"role": "user", "content": content},
            ],
            temperature=0.0,
            max_tokens=self.max_tokens,
            presence_penalty=0.0,
            frequency_penalty=0.0,
            timeout=40,
            response_format={"type": "json_object"},
        )
        try:
            response = response["choices"]
            response = response[0]["message"]["content"]
            return json.loads(response)
        except json.decoder.JSONDecodeError:
            print("Couldn't parse JSON from model response")
        except Exception as err:
            print(f"Unexpected {err=}, {type(err)=}")
            raise

