import os

BASE_DIR = os.path.dirname(os.path.realpath(__file__))


class Config(object):
    DEBUG = False
    TESTING = False
    OPENAI_API_KEY = "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"
    OPENAI_MODEL = "gpt-4-0613"
    LEARNING_LANGUAGE = "Italian"

    @property
    def DATABASE_URI(self):
        return 'sqlite:///' + os.path.join(BASE_DIR, f'{self.LEARNING_LANGUAGE}.db')


class ProductionConfig(Config):
    pass


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True