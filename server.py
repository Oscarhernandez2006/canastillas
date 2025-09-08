import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs
from api import get_dashboard_metrics, get_inventario, get_movimientos, get_movimiento_by_id, add_canastilla, add_movimiento, update_movimiento, delete_movimiento
from api import get_usuarios, get_usuario_by_id, add_usuario, update_usuario, delete_usuario

PORT = 8000

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        if path == '/api/dashboard/metrics':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            data, status = get_dashboard_metrics()
            self.wfile.write(json.dumps(data).encode('utf-8'))
    
        elif path == '/api/inventario':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            data, status = get_inventario()
            self.wfile.write(json.dumps(data).encode('utf-8'))
            
        elif path == '/api/movimientos':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            data, status = get_movimientos()
            self.wfile.write(json.dumps(data).encode('utf-8'))
            
        elif path == '/api/usuarios':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            data, status = get_usuarios()
            self.wfile.write(json.dumps(data).encode('utf-8'))
            
        elif path.startswith('/api/movimiento/'):
            # Obtener un movimiento específico por ID
            try:
                movimiento_id = int(path.split('/')[-1])
                data, status = get_movimiento_by_id(movimiento_id)
                self.send_response(status)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode('utf-8'))
            except (ValueError, IndexError):
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "ID de movimiento inválido"}).encode('utf-8'))
                
        elif path.startswith('/api/usuario/'):
            # Obtener un usuario específico por ID
            try:
                usuario_id = int(path.split('/')[-1])
                data, status = get_usuario_by_id(usuario_id)
                self.send_response(status)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode('utf-8'))
            except (ValueError, IndexError):
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "ID de usuario inválido"}).encode('utf-8'))
                
        elif path.startswith('/html/'):
            # Servir archivos HTML desde la carpeta 'html'
            file_path = os.path.join(os.getcwd(), path[1:])
            try:
                with open(file_path, 'rb') as file:
                    self.send_response(200)
                    self.send_header('Content-type', 'text/html')
                    self.end_headers()
                    self.wfile.write(file.read())
            except FileNotFoundError:
                self.send_error(404, "File Not Found")
                
        elif path.startswith('/css/'):
            # Servir archivos CSS
            file_path = os.path.join(os.getcwd(), path[1:])
            try:
                with open(file_path, 'rb') as file:
                    self.send_response(200)
                    self.send_header('Content-type', 'text/css')
                    self.end_headers()
                    self.wfile.write(file.read())
            except FileNotFoundError:
                self.send_error(404, "File Not Found")
                
        elif path.startswith('/js/'):
            # Servir archivos JavaScript
            file_path = os.path.join(os.getcwd(), path[1:])
            try:
                with open(file_path, 'rb') as file:
                    self.send_response(200)
                    self.send_header('Content-type', 'application/javascript')
                    self.end_headers()
                    self.wfile.write(file.read())
            except FileNotFoundError:
                self.send_error(404, "File Not Found")
        else:
            super().do_GET()
    
    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        if path == '/api/canastilla/add':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            id_canastilla = data.get('id_canastilla')
            estado = data.get('estado')
            ubicacion = data.get('ubicacion')
            
            if id_canastilla and estado and ubicacion:
                response_data, status = add_canastilla(id_canastilla, estado, ubicacion)
                self.send_response(status)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
            else:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Datos incompletos"}).encode('utf-8'))
                
        elif path == '/api/movimiento/add':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            id_canastilla = data.get('id_canastilla')
            tipo_movimiento = data.get('tipo_movimiento')
            ubicacion_origen = data.get('ubicacion_origen')
            ubicacion_destino = data.get('ubicacion_destino')
            id_usuario_responsable = data.get('id_usuario_responsable')
            
            if id_canastilla and tipo_movimiento and ubicacion_origen and ubicacion_destino and id_usuario_responsable:
                response_data, status = add_movimiento(id_canastilla, tipo_movimiento, ubicacion_origen, ubicacion_destino, id_usuario_responsable)
                self.send_response(status)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
            else:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Datos incompletos"}).encode('utf-8'))
                
        elif path == '/api/usuario/add':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            nombre = data.get('nombre')
            email = data.get('email')
            password = data.get('password')
            rol = data.get('rol')
            estado = data.get('estado')
            
            if nombre and email and password and rol and estado:
                response_data, status = add_usuario(nombre, email, password, rol, estado)
                self.send_response(status)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
            else:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Datos incompletos"}).encode('utf-8'))
                
        else:
            super().do_POST()
    
    def do_PUT(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        if path.startswith('/api/movimiento/'):
            try:
                movimiento_id = int(path.split('/')[-1])
                content_length = int(self.headers['Content-Length'])
                put_data = self.rfile.read(content_length)
                data = json.loads(put_data.decode('utf-8'))
                
                id_canastilla = data.get('id_canastilla')
                tipo_movimiento = data.get('tipo_movimiento')
                ubicacion_origen = data.get('ubicacion_origen')
                ubicacion_destino = data.get('ubicacion_destino')
                id_usuario_responsable = data.get('id_usuario_responsable')
                
                if id_canastilla and tipo_movimiento and ubicacion_origen and ubicacion_destino and id_usuario_responsable:
                    response_data, status = update_movimiento(movimiento_id, id_canastilla, tipo_movimiento, ubicacion_origen, ubicacion_destino, id_usuario_responsable)
                    self.send_response(status)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))
                else:
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Datos incompletos"}).encode('utf-8'))
                    
            except (ValueError, IndexError):
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "ID de movimiento inválido"}).encode('utf-8'))
                
        elif path.startswith('/api/usuario/'):
            try:
                usuario_id = int(path.split('/')[-1])
                content_length = int(self.headers['Content-Length'])
                put_data = self.rfile.read(content_length)
                data = json.loads(put_data.decode('utf-8'))
                
                nombre = data.get('nombre')
                email = data.get('email')
                rol = data.get('rol')
                estado = data.get('estado')
                password = data.get('password')  # Opcional
                
                if nombre and email and rol and estado:
                    response_data, status = update_usuario(usuario_id, nombre, email, rol, estado, password)
                    self.send_response(status)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))
                else:
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Datos incompletos"}).encode('utf-8'))
                    
            except (ValueError, IndexError):
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "ID de usuario inválido"}).encode('utf-8'))
                
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Endpoint no encontrado"}).encode('utf-8'))
    
    def do_DELETE(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        if path.startswith('/api/movimiento/'):
            try:
                movimiento_id = int(path.split('/')[-1])
                response_data, status = delete_movimiento(movimiento_id)
                self.send_response(status)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
                    
            except (ValueError, IndexError):
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "ID de movimiento inválido"}).encode('utf-8'))
                
        elif path.startswith('/api/usuario/'):
            try:
                usuario_id = int(path.split('/')[-1])
                response_data, status = delete_usuario(usuario_id)
                self.send_response(status)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
                    
            except (ValueError, IndexError):
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "ID de usuario inválido"}).encode('utf-8'))
                
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Endpoint no encontrado"}).encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

Handler = MyHandler
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Servidor corriendo en el puerto {PORT}")
    print(f"Accede a: http://localhost:{PORT}/html/dashboard.html")
    httpd.serve_forever()