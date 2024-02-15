import os

BASE_DIR = os.path.dirname(os.path.realpath(__file__))


class Config(object):
    DEBUG = False
    TESTING = False
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    OPENAI_MODEL = os.getenv('OPENAI_MODEL') or "gpt-3.5-turbo-1106"
    LEARNING_LANGUAGE = "Italian"
    SUPPORTED_LANGUAGES = ["Italian", "Spanish", "French"]
    CORS_ORGINS = None

    @property
    def DATABASE_URI(self):
        return 'sqlite:///' + os.path.join(BASE_DIR, f'{self.LEARNING_LANGUAGE}.db')


class ProductionConfig(Config):
    CORS_ORGINS = ["holeytriangle.com"]


class DevelopmentConfig(Config):
    DEBUG = True
    CORS_ORGINS = "*"


class TestingConfig(Config):
    TESTING = True