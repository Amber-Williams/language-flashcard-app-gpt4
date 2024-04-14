import os

from pydantic import BaseSettings


BASE_DIR = os.path.dirname(os.path.realpath(__file__))


class Settings(BaseSettings):
    environment: str = os.getenv('ENVIRONMENT', 'local')
    debug: bool = False
    log_file: str = os.getenv('LOG_FILE', 'ricotta.log')
    testing: bool = False
    openai_api_key: str = os.getenv('OPENAI_API_KEY')
    openai_model: str = os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo-1106')
    learning_language: str = "Italian"
    supported_languages: list = ["Arabic",
                                 "French",
                                 "German",
                                 "Hindi",
                                 "Italian",
                                 "Japanese",
                                 "Mandarin",
                                 "Portuguese",
                                 "Russian",
                                 "Spanish"
                                 ]
    cors_origins: list = None
    default_language: str = supported_languages[0]

    class Config:
        env_file = ".env"

    @property
    def allow_origins(self):
        if self.environment == 'production':
            return ["holeytriangle.com"]
        elif self.environment == 'development':
            return "*"
        elif self.environment == 'local':
            return "*"
        else:
            return self.cors_origins

    @property
    def database_uri(self):
        if self.environment == 'production':
            return os.getenv('DATABASE_URI')
        elif self.environment == 'development':
            return os.getenv('DATABASE_URI')
        elif self.environment == 'local':
            return 'sqlite:///' + os.path.join(BASE_DIR, 'local.db')


config = Settings()
