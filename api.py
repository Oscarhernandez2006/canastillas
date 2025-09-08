from db_connection import get_db_connection, close_db_connection
from datetime import datetime, timedelta
import logging

import json
import mysql.connector
from mysql.connector import Error
from datetime import date

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

def get_dashboard_metrics():
    """
    Obtiene todas las métricas para el dashboard
    """
    connection = get_db_connection()
    if connection is None:
        return {"error": "No se pudo conectar a la base de datos"}, 500

    try:
        cursor = connection.cursor(dictionary=True)

        # 1. Métricas básicas de canastillas
        cursor.execute("SELECT COUNT(*) AS total FROM canastillas")
        total = cursor.fetchone()['total']

        cursor.execute("SELECT COUNT(*) AS disponibles FROM canastillas WHERE estado = 'Disponible'")
        disponibles = cursor.fetchone()['disponibles']

        cursor.execute("SELECT COUNT(*) AS en_movimiento FROM canastillas WHERE estado = 'En Tránsito'")
        en_movimiento = cursor.fetchone()['en_movimiento']

        cursor.execute("SELECT COUNT(*) AS en_mantenimiento FROM canastillas WHERE estado = 'En Reparación'")
        en_mantenimiento = cursor.fetchone()['en_mantenimiento']

        # 2. Distribución por ubicación (para gráfico de barras)
        cursor.execute("""
            SELECT 
                ubicacion,
                COUNT(*) as cantidad 
            FROM canastillas 
            GROUP BY ubicacion
            ORDER BY cantidad DESC
        """)
        ubicaciones_data = cursor.fetchall()
        
        grafico_barras = {
            "labels": [row['ubicacion'] for row in ubicaciones_data],
            "data": [row['cantidad'] for row in ubicaciones_data]
        }

        # 3. Tendencia de movimientos (últimos 6 meses)
        six_months_ago = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d')
        
        cursor.execute("""
            SELECT 
                DATE_FORMAT(fecha_movimiento, '%Y-%m') as mes,
                COUNT(*) as movimientos 
            FROM movimientos 
            WHERE fecha_movimiento >= %s
            GROUP BY mes 
            ORDER BY mes
        """, (six_months_ago,))
        
        tendencia_data = cursor.fetchall()
        
        grafico_tendencia = {
            "labels": [row['mes'] for row in tendencia_data],
            "data": [row['movimientos'] for row in tendencia_data]
        }

        # 4. Movimientos recientes (últimos 5 movimientos)
        cursor.execute("""
            SELECT 
                m.id_movimiento,
                m.id_canastilla,
                m.tipo_movimiento,
                m.ubicacion_origen,
                m.ubicacion_destino,
                u.nombre as usuario_responsable,
                m.fecha_movimiento
            FROM movimientos m
            LEFT JOIN usuarios u ON m.id_usuario_responsable = u.id_usuario
            ORDER BY m.fecha_movimiento DESC
            LIMIT 5
        """)
        
        movimientos_recientes = cursor.fetchall()
        
        # Formatear fechas para JSON
        for movimiento in movimientos_recientes:
            if movimiento['fecha_movimiento']:
                if isinstance(movimiento['fecha_movimiento'], (datetime, timedelta)):
                    movimiento['fecha_movimiento'] = movimiento['fecha_movimiento'].strftime('%Y-%m-%d %H:%M:%S')

        return {
            "total": total,
            "disponibles": disponibles,
            "en_movimiento": en_movimiento,
            "en_mantenimiento": en_mantenimiento,
            "grafico_barras": grafico_barras,
            "grafico_tendencia": grafico_tendencia,
            "movimientos_recientes": movimientos_recientes
        }, 200

    except Error as e:
        logger.error(f"Error al obtener métricas del dashboard: {e}")
        return {"error": "Error interno del servidor"}, 500
        
    finally:
        if connection and connection.is_connected():
            cursor.close()
            close_db_connection(connection)

def get_inventario():
    """
    Obtiene todo el inventario de canastillas
    """
    connection = get_db_connection()
    if connection is None:
        return {"error": "No se pudo conectar a la base de datos"}, 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                c.id_canastilla,
                c.estado,
                c.ubicacion,
                u.nombre as usuario_asignado,
                c.fecha_ultimo_movimiento
            FROM canastillas c
            LEFT JOIN usuarios u ON c.id_usuario_asignado = u.id_usuario
            ORDER BY c.id_canastilla
        """)
        
        inventario = cursor.fetchall()
        
        # Formatear fechas para JSON
        for item in inventario:
            if item['fecha_ultimo_movimiento']:
                if isinstance(item['fecha_ultimo_movimiento'], (datetime, date)):
                    item['fecha_ultimo_movimiento'] = item['fecha_ultimo_movimiento'].strftime('%Y-%m-%d')

        return {"data": inventario}, 200

    except Exception as e:
        logger.error(f"Error al obtener el inventario: {e}")
        return {"error": "Error interno del servidor"}, 500
    finally:
        if connection and connection.is_connected():
            cursor.close()
            close_db_connection(connection)

def get_movimientos():
    """
    Obtiene todos los movimientos
    """
    connection = get_db_connection()
    if connection is None:
        return {"error": "No se pudo conectar a la base de datos"}, 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                m.id_movimiento,
                m.id_canastilla,
                m.tipo_movimiento,
                m.ubicacion_origen,
                m.ubicacion_destino,
                u.nombre as usuario_responsable,
                m.fecha_movimiento
            FROM movimientos m
            LEFT JOIN usuarios u ON m.id_usuario_responsable = u.id_usuario
            ORDER BY m.fecha_movimiento DESC
        """)
        
        movimientos = cursor.fetchall()
        
        # Formatear fechas para JSON
        for movimiento in movimientos:
            if movimiento['fecha_movimiento']:
                if isinstance(movimiento['fecha_movimiento'], (datetime, date)):
                    movimiento['fecha_movimiento'] = movimiento['fecha_movimiento'].strftime('%Y-%m-%d %H:%M:%S')

        return {"data": movimientos}, 200

    except Exception as e:
        logger.error(f"Error al obtener movimientos: {e}")
        return {"error": "Error interno del servidor"}, 500
    finally:
        if connection and connection.is_connected():
            cursor.close()
            close_db_connection(connection)

def get_movimiento_by_id(id_movimiento):
    """
    Obtiene un movimiento específico por ID
    """
    connection = get_db_connection()
    if connection is None:
        return {"error": "No se pudo conectar a la base de datos"}, 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                m.id_movimiento,
                m.id_canastilla,
                m.tipo_movimiento,
                m.ubicacion_origen,
                m.ubicacion_destino,
                m.id_usuario_responsable,
                u.nombre as usuario_responsable,
                m.fecha_movimiento
            FROM movimientos m
            LEFT JOIN usuarios u ON m.id_usuario_responsable = u.id_usuario
            WHERE m.id_movimiento = %s
        """, (id_movimiento,))
        
        movimiento = cursor.fetchone()
        
        if not movimiento:
            return {"error": "Movimiento no encontrado"}, 404
        
        # Formatear fecha para JSON
        if movimiento['fecha_movimiento']:
            if isinstance(movimiento['fecha_movimiento'], (datetime, date)):
                movimiento['fecha_movimiento'] = movimiento['fecha_movimiento'].strftime('%Y-%m-%d %H:%M:%S')

        return {"data": movimiento}, 200

    except Exception as e:
        logger.error(f"Error al obtener el movimiento: {e}")
        return {"error": "Error interno del servidor"}, 500
    finally:
        if connection and connection.is_connected():
            cursor.close()
            close_db_connection(connection)

def add_canastilla(id_canastilla, estado, ubicacion):
    """
    Agrega una nueva canastilla a la base de datos
    """
    connection = get_db_connection()
    if connection is None:
        return {"error": "No se pudo conectar a la base de datos"}, 500
    
    try:
        cursor = connection.cursor()
        
        # Verificar si la canastilla ya existe
        cursor.execute("SELECT id_canastilla FROM canastillas WHERE id_canastilla = %s", (id_canastilla,))
        if cursor.fetchone():
            return {"error": "Ya existe una canastilla con este ID"}, 400
        
        # Insertar nueva canastilla
        sql = """
            INSERT INTO canastillas (id_canastilla, estado, ubicacion, fecha_ultimo_movimiento)
            VALUES (%s, %s, %s, NOW())
        """
        
        cursor.execute(sql, (id_canastilla, estado, ubicacion))
        connection.commit()
        
        return {"message": f"Canastilla {id_canastilla} agregada con éxito"}, 201

    except Error as e:
        connection.rollback()
        logger.error(f"Error al agregar canastilla: {e}")
        return {"error": "Error al agregar la canastilla"}, 500
        
    finally:
        if connection and connection.is_connected():
            cursor.close()
            close_db_connection(connection)

def add_movimiento(id_canastilla, tipo_movimiento, ubicacion_origen, ubicacion_destino, id_usuario_responsable):
    """
    Agrega un nuevo movimiento a la base de datos
    """
    connection = get_db_connection()
    if connection is None:
        return {"error": "No se pudo conectar a la base de datos"}, 500
    
    try:
        cursor = connection.cursor()
        
        # Verificar si la canastilla existe
        cursor.execute("SELECT id_canastilla FROM canastillas WHERE id_canastilla = %s", (id_canastilla,))
        if not cursor.fetchone():
            return {"error": "No existe una canastilla con este ID"}, 400
        
        # Insertar nuevo movimiento
        sql = """
            INSERT INTO movimientos (id_canastilla, tipo_movimiento, ubicacion_origen, ubicacion_destino, id_usuario_responsable)
            VALUES (%s, %s, %s, %s, %s)
        """
        
        cursor.execute(sql, (id_canastilla, tipo_movimiento, ubicacion_origen, ubicacion_destino, id_usuario_responsable))
        
        # Actualizar la ubicación de la canastilla
        if tipo_movimiento == 'entrada':
            nueva_ubicacion = ubicacion_destino
            nuevo_estado = 'Disponible' if ubicacion_destino != 'Taller' else 'En Reparación'
        else:  # salida
            nueva_ubicacion = 'En Tránsito'
            nuevo_estado = 'En Tránsito'
        
        update_sql = """
            UPDATE canastillas 
            SET ubicacion = %s, estado = %s, fecha_ultimo_movimiento = NOW()
            WHERE id_canastilla = %s
        """
        
        cursor.execute(update_sql, (nueva_ubicacion, nuevo_estado, id_canastilla))
        
        connection.commit()
        
        return {"message": f"Movimiento registrado con éxito para la canastilla {id_canastilla}"}, 201

    except Error as e:
        connection.rollback()
        logger.error(f"Error al agregar movimiento: {e}")
        return {"error": "Error al registrar el movimiento"}, 500
        
    finally:
        if connection and connection.is_connected():
            cursor.close()
            close_db_connection(connection)

def update_movimiento(id_movimiento, id_canastilla, tipo_movimiento, ubicacion_origen, ubicacion_destino, id_usuario_responsable):
    """
    Actualiza un movimiento existente
    """
    connection = get_db_connection()
    if connection is None:
        return {"error": "No se pudo conectar a la base de datos"}, 500
    
    try:
        cursor = connection.cursor(dictionary=True)  # ¡IMPORTANTE! Usar dictionary=True
        
        # Verificar si el movimiento existe
        cursor.execute("SELECT id_movimiento, id_canastilla FROM movimientos WHERE id_movimiento = %s", (id_movimiento,))
        movimiento_existente = cursor.fetchone()
        if not movimiento_existente:
            return {"error": "No existe un movimiento con este ID"}, 404
        
        # Verificar si la canastilla existe
        cursor.execute("SELECT id_canastilla FROM canastillas WHERE id_canastilla = %s", (id_canastilla,))
        if not cursor.fetchone():
            return {"error": "No existe una canastilla con este ID"}, 400
        
        # Obtener datos anteriores del movimiento
        cursor.execute("""
            SELECT tipo_movimiento, ubicacion_origen, ubicacion_destino, id_canastilla 
            FROM movimientos 
            WHERE id_movimiento = %s
        """, (id_movimiento,))
        movimiento_anterior = cursor.fetchone()
        
        # Actualizar el movimiento
        sql = """
            UPDATE movimientos 
            SET id_canastilla = %s, tipo_movimiento = %s, ubicacion_origen = %s, 
                ubicacion_destino = %s, id_usuario_responsable = %s
            WHERE id_movimiento = %s
        """
        
        cursor.execute(sql, (id_canastilla, tipo_movimiento, ubicacion_origen, ubicacion_destino, id_usuario_responsable, id_movimiento))
        
        # Si la canastilla cambió o el tipo de movimiento cambió, actualizar la canastilla
        if (movimiento_anterior['id_canastilla'] != id_canastilla or 
            movimiento_anterior['tipo_movimiento'] != tipo_movimiento):
            
            if tipo_movimiento == 'entrada':
                nueva_ubicacion = ubicacion_destino
                nuevo_estado = 'Disponible' if ubicacion_destino != 'Taller' else 'En Reparación'
            else:  # salida
                nueva_ubicacion = 'En Tránsito'
                nuevo_estado = 'En Tránsito'
            
            update_sql = """
                UPDATE canastillas 
                SET ubicacion = %s, estado = %s, fecha_ultimo_movimiento = NOW()
                WHERE id_canastilla = %s
            """
            
            cursor.execute(update_sql, (nueva_ubicacion, nuevo_estado, id_canastilla))
        
        connection.commit()
        
        return {"message": f"Movimiento {id_movimiento} actualizado con éxito"}, 200

    except Error as e:
        connection.rollback()
        logger.error(f"Error al actualizar movimiento: {e}")
        return {"error": f"Error al actualizar el movimiento: {str(e)}"}, 500
        
    finally:
        if connection and connection.is_connected():
            cursor.close()
            close_db_connection(connection)

def delete_movimiento(id_movimiento):
    """
    Elimina un movimiento
    """
    connection = get_db_connection()
    if connection is None:
        return {"error": "No se pudo conectar a la base de datos"}, 500
    
    try:
        cursor = connection.cursor()
        
        # Verificar si el movimiento existe
        cursor.execute("SELECT id_movimiento FROM movimientos WHERE id_movimiento = %s", (id_movimiento,))
        if not cursor.fetchone():
            return {"error": "No existe un movimiento con este ID"}, 404
        
        # Eliminar el movimiento
        sql = "DELETE FROM movimientos WHERE id_movimiento = %s"
        cursor.execute(sql, (id_movimiento,))
        connection.commit()
        
        return {"message": f"Movimiento {id_movimiento} eliminado con éxito"}, 200

    except Error as e:
        connection.rollback()
        logger.error(f"Error al eliminar movimiento: {e}")
        return {"error": "Error al eliminar el movimiento"}, 500
        
    finally:
        if connection and connection.is_connected():
            cursor.close()
            close_db_connection(connection)

def get_usuarios():
    """
    Obtiene todos los usuarios
    """
    connection = get_db_connection()
    if connection is None:
        return {"error": "No se pudo conectar a la base de datos"}, 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                id_usuario,
                nombre,
                email,
                rol,
                estado,
                fecha_creacion,
                ultimo_acceso
            FROM usuarios 
            ORDER BY nombre
        """)
        
        usuarios = cursor.fetchall()
        
        # Formatear fechas para JSON
        for usuario in usuarios:
            if usuario['fecha_creacion']:
                if isinstance(usuario['fecha_creacion'], (datetime, date)):
                    usuario['fecha_creacion'] = usuario['fecha_creacion'].strftime('%Y-%m-%d %H:%M:%S')
            if usuario['ultimo_acceso']:
                if isinstance(usuario['ultimo_acceso'], (datetime, date)):
                    usuario['ultimo_acceso'] = usuario['ultimo_acceso'].strftime('%Y-%m-%d %H:%M:%S')

        return {"data": usuarios}, 200

    except Exception as e:
        logger.error(f"Error al obtener usuarios: {e}")
        return {"error": "Error interno del servidor"}, 500
    finally:
        if connection and connection.is_connected():
            cursor.close()
            close_db_connection(connection)

def get_usuario_by_id(id_usuario):
    """
    Obtiene un usuario específico por ID
    """
    connection = get_db_connection()
    if connection is None:
        return {"error": "No se pudo conectar a la base de datos"}, 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                id_usuario,
                nombre,
                email,
                rol,
                estado,
                fecha_creacion,
                ultimo_acceso
            FROM usuarios 
            WHERE id_usuario = %s
        """, (id_usuario,))
        
        usuario = cursor.fetchone()
        
        if not usuario:
            return {"error": "Usuario no encontrado"}, 404
        
        # Formatear fechas para JSON
        if usuario['fecha_creacion']:
            if isinstance(usuario['fecha_creacion'], (datetime, date)):
                usuario['fecha_creacion'] = usuario['fecha_creacion'].strftime('%Y-%m-%d %H:%M:%S')
        if usuario['ultimo_acceso']:
            if isinstance(usuario['ultimo_acceso'], (datetime, date)):
                usuario['ultimo_acceso'] = usuario['ultimo_acceso'].strftime('%Y-%m-%d %H:%M:%S')

        return {"data": usuario}, 200

    except Exception as e:
        logger.error(f"Error al obtener el usuario: {e}")
        return {"error": "Error interno del servidor"}, 500
    finally:
        if connection and connection.is_connected():
            cursor.close()
            close_db_connection(connection)

def add_usuario(nombre, email, password, rol, estado):
    """
    Agrega un nuevo usuario a la base de datos
    """
    connection = get_db_connection()
    if connection is None:
        return {"error": "No se pudo conectar a la base de datos"}, 500
    
    try:
        cursor = connection.cursor()
        
        # Verificar si el email ya existe
        cursor.execute("SELECT id_usuario FROM usuarios WHERE email = %s", (email,))
        if cursor.fetchone():
            return {"error": "Ya existe un usuario con este email"}, 400
        
        # Hash de la contraseña (deberías usar bcrypt en producción)
        # Para desarrollo, usaremos un hash simple
        import hashlib
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        # Insertar nuevo usuario
        sql = """
            INSERT INTO usuarios (nombre, email, password, rol, estado, fecha_creacion)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """
        
        cursor.execute(sql, (nombre, email, hashed_password, rol, estado))
        connection.commit()
        
        return {"message": f"Usuario {nombre} agregado con éxito"}, 201

    except Error as e:
        connection.rollback()
        logger.error(f"Error al agregar usuario: {e}")
        return {"error": "Error al agregar el usuario"}, 500
        
    finally:
        if connection and connection.is_connected():
            cursor.close()
            close_db_connection(connection)

def update_usuario(id_usuario, nombre, email, rol, estado, password=None):
    """
    Actualiza un usuario existente
    """
    connection = get_db_connection()
    if connection is None:
        return {"error": "No se pudo conectar a la base de datos"}, 500
    
    try:
        cursor = connection.cursor()
        
        # Verificar si el usuario existe
        cursor.execute("SELECT id_usuario FROM usuarios WHERE id_usuario = %s", (id_usuario,))
        if not cursor.fetchone():
            return {"error": "No existe un usuario con este ID"}, 404
        
        # Verificar si el email ya existe (excluyendo el usuario actual)
        cursor.execute("SELECT id_usuario FROM usuarios WHERE email = %s AND id_usuario != %s", (email, id_usuario))
        if cursor.fetchone():
            return {"error": "Ya existe otro usuario con este email"}, 400
        
        # Construir la consulta SQL dinámicamente
        if password:
            # Hash de la nueva contraseña
            import hashlib
            hashed_password = hashlib.sha256(password.encode()).hexdigest()
            sql = """
                UPDATE usuarios 
                SET nombre = %s, email = %s, password = %s, rol = %s, estado = %s
                WHERE id_usuario = %s
            """
            cursor.execute(sql, (nombre, email, hashed_password, rol, estado, id_usuario))
        else:
            sql = """
                UPDATE usuarios 
                SET nombre = %s, email = %s, rol = %s, estado = %s
                WHERE id_usuario = %s
            """
            cursor.execute(sql, (nombre, email, rol, estado, id_usuario))
        
        connection.commit()
        
        return {"message": f"Usuario {nombre} actualizado con éxito"}, 200

    except Error as e:
        connection.rollback()
        logger.error(f"Error al actualizar usuario: {e}")
        return {"error": "Error al actualizar el usuario"}, 500
        
    finally:
        if connection and connection.is_connected():
            cursor.close()
            close_db_connection(connection)

def delete_usuario(id_usuario):
    """
    Elimina un usuario
    """
    connection = get_db_connection()
    if connection is None:
        return {"error": "No se pudo conectar a la base de datos"}, 500
    
    try:
        cursor = connection.cursor()
        
        # Verificar si el usuario existe
        cursor.execute("SELECT id_usuario FROM usuarios WHERE id_usuario = %s", (id_usuario,))
        if not cursor.fetchone():
            return {"error": "No existe un usuario con este ID"}, 404
        
        # Verificar si el usuario tiene movimientos asociados
        cursor.execute("SELECT COUNT(*) as count FROM movimientos WHERE id_usuario_responsable = %s", (id_usuario,))
        movimientos_count = cursor.fetchone()[0]
        
        if movimientos_count > 0:
            return {"error": "No se puede eliminar el usuario porque tiene movimientos asociados"}, 400
        
        # Eliminar el usuario
        sql = "DELETE FROM usuarios WHERE id_usuario = %s"
        cursor.execute(sql, (id_usuario,))
        connection.commit()
        
        return {"message": f"Usuario {id_usuario} eliminado con éxito"}, 200

    except Error as e:
        connection.rollback()
        logger.error(f"Error al eliminar usuario: {e}")
        return {"error": "Error al eliminar el usuario"}, 500
        
    finally:
        if connection and connection.is_connected():
            cursor.close()
            close_db_connection(connection)

def get_canastilla_by_id(id_canastilla):
    """
    Obtiene una canastilla específica por ID
    """
    connection = get_db_connection()
    if connection is None:
        return {"error": "No se pudo conectar a la base de datos"}, 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                c.id_canastilla,
                c.estado,
                c.ubicacion,
                u.nombre as usuario_asignado,
                c.fecha_ultimo_movimiento
            FROM canastillas c
            LEFT JOIN usuarios u ON c.id_usuario_asignado = u.id_usuario
            WHERE c.id_canastilla = %s
        """, (id_canastilla,))
        
        canastilla = cursor.fetchone()
        
        if not canastilla:
            return {"error": "Canastilla no encontrada"}, 404
        
        # Formatear fecha para JSON
        if canastilla['fecha_ultimo_movimiento']:
            if isinstance(canastilla['fecha_ultimo_movimiento'], (datetime, date)):
                canastilla['fecha_ultimo_movimiento'] = canastilla['fecha_ultimo_movimiento'].strftime('%Y-%m-%d %H:%M:%S')

        return {"data": canastilla}, 200

    except Exception as e:
        logger.error(f"Error al obtener la canastilla: {e}")
        return {"error": "Error interno del servidor"}, 500
    finally:
        if connection and connection.is_connected():
            cursor.close()
            close_db_connection(connection)

def update_canastilla(id_canastilla, estado, ubicacion):
    """
    Actualiza una canastilla existente
    """
    connection = get_db_connection()
    if connection is None:
        return {"error": "No se pudo conectar a la base de datos"}, 500
    
    try:
        cursor = connection.cursor()
        
        # Verificar si la canastilla existe
        cursor.execute("SELECT id_canastilla FROM canastillas WHERE id_canastilla = %s", (id_canastilla,))
        if not cursor.fetchone():
            return {"error": "No existe una canastilla con este ID"}, 404
        
        # Actualizar la canastilla
        sql = """
            UPDATE canastillas 
            SET estado = %s, ubicacion = %s, fecha_ultimo_movimiento = NOW()
            WHERE id_canastilla = %s
        """
        
        cursor.execute(sql, (estado, ubicacion, id_canastilla))
        connection.commit()
        
        return {"message": f"Canastilla {id_canastilla} actualizada con éxito"}, 200

    except Error as e:
        connection.rollback()
        logger.error(f"Error al actualizar canastilla: {e}")
        return {"error": "Error al actualizar la canastilla"}, 500
        
    finally:
        if connection and connection.is_connected():
            cursor.close()
            close_db_connection(connection)

def delete_canastilla(id_canastilla):
    """
    Elimina una canastilla
    """
    connection = get_db_connection()
    if connection is None:
        return {"error": "No se pudo conectar a la base de datos"}, 500
    
    try:
        cursor = connection.cursor()
        
        # Verificar si la canastilla existe
        cursor.execute("SELECT id_canastilla FROM canastillas WHERE id_canastilla = %s", (id_canastilla,))
        if not cursor.fetchone():
            return {"error": "No existe una canastilla con este ID"}, 404
        
        # Verificar si la canastilla tiene movimientos asociados
        cursor.execute("SELECT COUNT(*) as count FROM movimientos WHERE id_canastilla = %s", (id_canastilla,))
        movimientos_count = cursor.fetchone()[0]
        
        if movimientos_count > 0:
            return {"error": "No se puede eliminar la canastilla porque tiene movimientos asociados"}, 400
        
        # Eliminar la canastilla
        sql = "DELETE FROM canastillas WHERE id_canastilla = %s"
        cursor.execute(sql, (id_canastilla,))
        connection.commit()
        
        return {"message": f"Canastilla {id_canastilla} eliminada con éxito"}, 200

    except Error as e:
        connection.rollback()
        logger.error(f"Error al eliminar canastilla: {e}")
        return {"error": "Error al eliminar la canastilla"}, 500
        
    finally:
        if connection and connection.is_connected():
            cursor.close()
            close_db_connection(connection)