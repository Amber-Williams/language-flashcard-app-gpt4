import json
import os
from random import shuffle

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    ForeignKey,
)
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from flask import Flask, render_template, request, jsonify

import config

app = Flask(__name__)
language = config.LEARNING_LANGUAGE
BASE_DIR = os.path.dirname(os.path.realpath(__file__))
conn_str = 'sqlite:///'+os.path.join(BASE_DIR, f'{language}.db')
engine = create_engine(conn_str)
Base = declarative_base()

class Card(Base):
    __tablename__ = 'cards'

    id = Column(Integer, autoincrement=True, primary_key=True)
    word = Column(String, nullable=False, unique=True)
    english = Column(String, nullable=False)
    sentenceLANG = Column(String, nullable=False)
    sentenceEN = Column(String, nullable=False)
    incorrect_options = relationship("IncorrectOption", back_populates="card")

class IncorrectOption(Base):
    __tablename__ = 'incorrect_options'
    
    id = Column(Integer, autoincrement=True, primary_key=True)
    option = Column(String, nullable=False)
    card_id = Column(Integer, ForeignKey('cards.id'))
    card = relationship("Card", back_populates="incorrect_options")

Base.metadata.create_all(engine)
session = sessionmaker()(bind=engine)

chat = ChatOpenAI(openai_api_key=config.OPENAI_API_KEY, temperature=1, model=config.OPENAI_MODEL)
description = """```{description}```"""


string_template = f"""Give 5 words written in {language} that are around the topic: {description}, \
accompanied with its correct English translation and three incorrect translations
that are realistic and relevant to the correct answer.
Also give me the English translation of the word, and present the word within the context
of an {language} sentence, and also provide its English translation. Do not provide words that are
the same in both languages. Only provide words that are relevant to the topic.



Instructions:
1. Format the output as JSON with the data represented as an array of dictionaries with the following keys:
"word": str // {language} word
"incorrect_options": List[str] // Incorrect English translations
"english": str // English translation of the {language} word
"sentenceLANG": str // Example sentence in {language} using the word
"sentenceEN": str // English translation of the example sentence
2. Ensure to return JSON parsable output.
"""

prompt_template = ChatPromptTemplate.from_template(string_template)


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/get_new_words', methods=['POST'])
def get_word():
    description = request.json.get('description', '')
    words_request = prompt_template.format_messages(description=description)
    words_response = chat(words_request)
    try:
        words = json.loads(words_response.content)
        for word in words:
            card = Card(word=word['word'], english=word['english'], sentenceLANG=word['sentenceLANG'], sentenceEN=word['sentenceEN'])
            for incorrect_option in word['incorrect_options']:
                card.incorrect_options.append(IncorrectOption(option=incorrect_option))
            session.add(card)
            word["correct"] = word['english']
        session.commit()
        return jsonify(words)
    except json.decoder.JSONDecodeError:
        print("Couldn't parse JSON from model response")
        return 500
    except Exception as err:
        print(f"Unexpected {err=}, {type(err)=}")
        return 500


@app.route('/get_seen_words', methods=['GET'])
def get_seen_word():
    try:
        cards = []
        ormCards = session.query(Card).all()
        for ormCard in ormCards:
            card = {
                "word": ormCard.word,
                "correct": ormCard.english,
                "english": ormCard.english,
                "sentenceLANG": ormCard.sentenceLANG,
                "sentenceEN": ormCard.sentenceEN,
                "incorrect_options": [incorrect_option.option for incorrect_option in ormCard.incorrect_options]
            }
            cards.append(card)
        shuffle(cards)
        return jsonify(cards)
    except json.decoder.JSONDecodeError:
        print("Couldn't parse JSON from model response")
        return 500
    except Exception as err:
        print(f"Unexpected {err=}, {type(err)=}")
        return 500


if __name__ == "__main__":
    app.run(port=5000)
