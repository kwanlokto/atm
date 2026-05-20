from server.exceptions.base import InternalException


class DBException(InternalException):
    def __init__(self, message, title=None, status_code=500):
        super().__init__(message, title=title, status_code=status_code)
