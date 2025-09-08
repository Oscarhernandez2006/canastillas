import mysql.connector
from mysql.connector import Error
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_db_connection():
    """
    Establece y retorna una conexión a la base de datos MySQL
    """
    try:
        connection = mysql.connector.connect(
            host='localhost',
            user='root',  # Cambia por tu usuario
            password='',  # Cambia por tu contraseña
            database='control_canastillas_v2'
        )
        
        if connection.is_connected():
            logger.info("Conexión a la base de datos establecida correctamente")
            return connection
            
    except Error as e:
        logger.error(f"Error al conectar a la base de datos: {e}")
        return None

def close_db_connection(connection):
    """
    Cierra la conexión a la base de datos
    """
    if connection and connection.is_connected():
        connection.close()
        logger.info("Conexión a la base de datos cerrada")