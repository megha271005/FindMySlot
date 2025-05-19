from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from config import Config

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.parking import parking_bp
    from app.routes.bookings import bookings_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(parking_bp, url_prefix='/api/parking')
    app.register_blueprint(bookings_bp, url_prefix='/api/bookings')
    
    # Register error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {"message": "Resource not found"}, 404
    
    @app.errorhandler(500)
    def server_error(error):
        return {"message": "Internal server error"}, 500
    
    return app