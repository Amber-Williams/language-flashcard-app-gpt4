import os

from pydantic import BaseSettings


BASE_DIR = os.path.dirname(os.path.realpath(__file__))


class Settings(BaseSettings):
    environment: str = os.getenv('ENVIRONMENT', 'development')
    debug: bool = False
    testing: bool = False
    openai_api_key: str = os.getenv('OPENAI_API_KEY')
    openai_model: str = os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo-1106')
    learning_language: str = "Italian"
    supported_languages: list = ["Italian"]
    cors_origins: list = None
    database_uri: str = None
    default_language: str = supported_languages[0]

    class Config:
        env_file = ".env"

    @property
    def allow_origins(self):
        if self.environment == 'production':
            return ["holeytriangle.com"]
        elif self.environment == 'development':
            return "*"
        else:
            return self.cors_origins

    @property
    def configure_database_uri(self):
        return 'sqlite:///' + os.path.join(BASE_DIR, f'{self.learning_language}.db')

config = Settings()