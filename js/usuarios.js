document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const modal = document.getElementById('userModal');
    const modalTitle = document.getElementById('modal-title');
    const btnAddUser = document.getElementById('btn-add-user');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-button');
    const form = document.getElementById('usuario-form');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('toggle-password');
    const usuariosBody = document.getElementById('usuarios-body');
    const saveButton = document.getElementById('save-button');
    const btnUpdate = document.getElementById('btn-update');
    const filterRol = document.getElementById('filter-rol');
    const filterEstado = document.getElementById('filter-estado');
    const searchInput = document.getElementById('search');
    const confirmModal = document.getElementById('confirmModal');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    const confirmCancelBtn = document.getElementById('confirm-cancel');
    
    // Variables de estado
    let usuarioEditando = null;
    let usuarios = [];
    let usuarioAEliminar = null;

    // Cargar usuarios al iniciar
    fetchUsuarios();

    // Función para cargar usuarios desde la API
    async function fetchUsuarios() {
        try {
            mostrarCarga(true);
            const response = await fetch('http://localhost:8000/api/usuarios');
            
            if (!response.ok) {
                throw new Error('Error al cargar usuarios');
            }
            
            const data = await response.json();
            usuarios = data.data || [];
            aplicarFiltros();
            
        } catch (error) {
            console.error('Error:', error);
            mostrarError('No se pudieron cargar los usuarios. Verifica la conexión con el servidor.');
        } finally {
            mostrarCarga(false);
        }
    }

    // Aplicar filtros a los usuarios
    function aplicarFiltros() {
        let usuariosFiltrados = [...usuarios];
        
        // Filtrar por rol
        if (filterRol.value !== 'all') {
            usuariosFiltrados = usuariosFiltrados.filter(u => u.rol === filterRol.value);
        }
        
        // Filtrar por estado
        if (filterEstado.value !== 'all') {
            usuariosFiltrados = usuariosFiltrados.filter(u => u.estado === filterEstado.value);
        }
        
        // Filtrar por búsqueda
        if (searchInput.value) {
            const searchTerm = searchInput.value.toLowerCase();
            usuariosFiltrados = usuariosFiltrados.filter(u => 
                (u.nombre && u.nombre.toLowerCase().includes(searchTerm)) ||
                (u.email && u.email.toLowerCase().includes(searchTerm))
            );
        }
        
        cargarUsuarios(usuariosFiltrados);
        actualizarEstadisticas(usuariosFiltrados);
    }

    // Cargar usuarios en la tabla
    function cargarUsuarios(usuarios) {
        usuariosBody.innerHTML = '';
        
        if (usuarios.length === 0) {
            usuariosBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 20px;">
                        <i class="fas fa-users" style="font-size: 48px; color: #ccc; margin-bottom: 10px;"></i>
                        <p>No se encontraron usuarios</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        usuarios.forEach(usuario => {
            const row = document.createElement('tr');
            
            // Determinar clase para el badge según el estado
            const estadoClass = usuario.estado === 'Activo' ? 'active' : 'inactive';
            const rolClass = usuario.rol.toLowerCase().replace(' ', '-');
            
            // Formatear fechas
            const fechaCreacion = usuario.fecha_creacion ? 
                new Date(usuario.fecha_creacion).toLocaleDateString() : 'N/A';
                
            const ultimoAcceso = usuario.ultimo_acceso ? 
                new Date(usuario.ultimo_acceso).toLocaleDateString() : 'Nunca';
            
            row.innerHTML = `
                <td>${usuario.id_usuario || 'N/A'}</td>
                <td>${usuario.nombre || 'N/A'}</td>
                <td>${usuario.email || 'N/A'}</td>
                <td><span class="badge ${rolClass}">${usuario.rol || 'N/A'}</span></td>
                <td><span class="badge ${estadoClass}">${usuario.estado || 'N/A'}</span></td>
                <td>${fechaCreacion}</td>
                <td>${ultimoAcceso}</td>
                <td class="action-buttons">
                    <button class="btn-edit" data-id="${usuario.id_usuario}"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn-delete" data-id="${usuario.id_usuario}"><i class="fas fa-trash"></i> Eliminar</button>
                </td>
            `;
            
            usuariosBody.appendChild(row);
        });
        
        // Agregar event listeners a los botones de acción
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => editarUsuario(parseInt(btn.dataset.id)));
        });
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => mostrarConfirmacionEliminar(parseInt(btn.dataset.id)));
        });
    }

    // Actualizar estadísticas
    function actualizarEstadisticas(usuarios) {
        const total = usuarios.length;
        const administradores = usuarios.filter(u => u.rol === 'Administrador').length;
        const operadores = usuarios.filter(u => u.rol === 'Operador').length;
        const activos = usuarios.filter(u => u.estado === 'Activo').length;
        
        document.getElementById('total-usuarios').textContent = total;
        document.getElementById('admin-count').textContent = administradores;
        document.getElementById('operador-count').textContent = operadores;
        document.getElementById('activos-count').textContent = activos;
    }

    // Mostrar confirmación de eliminación
    function mostrarConfirmacionEliminar(id) {
        usuarioAEliminar = id;
        confirmModal.style.display = 'block';
    }

    // Eliminar usuario después de confirmación
    async function eliminarUsuario() {
        if (!usuarioAEliminar) return;
        
        try {
            const response = await fetch(`http://localhost:8000/api/usuario/${usuarioAEliminar}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Error al eliminar el usuario');
            }
            
            mostrarMensaje(result.message || 'Usuario eliminado con éxito', 'success');
            confirmModal.style.display = 'none';
            
            // Recargar datos
            fetchUsuarios();
            
        } catch (error) {
            console.error('Error:', error);
            mostrarError(error.message || 'Error al eliminar el usuario');
        } finally {
            usuarioAEliminar = null;
        }
    }

    // Mostrar mensaje de error
    function mostrarError(mensaje) {
        // Crear o mostrar contenedor de error
        let errorContainer = document.getElementById('error-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'error-container';
            errorContainer.style.cssText = `
                background: #ffebee;
                color: #c62828;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                border: 1px solid #f44336;
            `;
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.insertBefore(errorContainer, mainContent.firstChild);
            }
        }
        
        errorContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${mensaje}</span>
                <button onclick="this.parentElement.parentElement.style.display='none'" 
                        style="margin-left: auto; background: none; border: none; cursor: pointer;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        errorContainer.style.display = 'block';
    }

    // Mostrar mensaje de éxito
    function mostrarMensaje(mensaje, tipo = 'success') {
        // Crear elemento de mensaje si no existe
        let mensajeEl = document.getElementById('mensaje-temporal');
        if (!mensajeEl) {
            mensajeEl = document.createElement('div');
            mensajeEl.id = 'mensaje-temporal';
            mensajeEl.style.position = 'fixed';
            mensajeEl.style.top = '20px';
            mensajeEl.style.right = '20px';
            mensajeEl.style.padding = '12px 20px';
            mensajeEl.style.borderRadius = '6px';
            mensajeEl.style.color = 'white';
            mensajeEl.style.zIndex = '10000';
            mensajeEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            mensajeEl.style.transition = 'opacity 0.3s';
            document.body.appendChild(mensajeEl);
        }
        
        // Estilo según el tipo
        if (tipo === 'success') {
            mensajeEl.style.background = 'linear-gradient(to right, #00b09b, #96c93d)';
        } else {
            mensajeEl.style.background = 'linear-gradient(to right, #ff416c, #ff4b2b)';
        }
        
        // Mostrar mensaje
        mensajeEl.textContent = mensaje;
        mensajeEl.style.opacity = '1';
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            mensajeEl.style.opacity = '0';
        }, 3000);
    }

    // Mostrar/ocultar indicador de carga
    function mostrarCarga(mostrar) {
        if (mostrar) {
            btnUpdate.disabled = true;
            btnUpdate.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
        } else {
            btnUpdate.disabled = false;
            btnUpdate.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar';
        }
    }

    // Abrir modal para nuevo usuario
    btnAddUser.addEventListener('click', () => {
        usuarioEditando = null;
        modalTitle.textContent = 'Nuevo Usuario';
        saveButton.textContent = 'Registrar Usuario';
        form.reset();
        modal.style.display = 'block';
    });
    
    // Cerrar modales
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        form.reset();
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        form.reset();
    });
    
    confirmCancelBtn.addEventListener('click', () => {
        confirmModal.style.display = 'none';
        usuarioAEliminar = null;
    });
    
    // Cerrar modal al hacer clic fuera del contenido
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            form.reset();
        }
        if (event.target === confirmModal) {
            confirmModal.style.display = 'none';
            usuarioAEliminar = null;
        }
    });
    
    // Mostrar/ocultar contraseña
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Cambiar ícono
        togglePassword.classList.toggle('fa-eye');
        togglePassword.classList.toggle('fa-eye-slash');
    });
    
    // Manejar envío del formulario
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const formData = new FormData(form);
        const userData = {
            nombre: formData.get('nombre'),
            email: formData.get('email'),
            password: formData.get('password'),
            rol: formData.get('rol'),
            estado: formData.get('estado')
        };
        
        try {
            let url = 'http://localhost:8000/api/usuario/add';
            let method = 'POST';
            
            if (usuarioEditando) {
                url = `http://localhost:8000/api/usuario/${usuarioEditando}`;
                method = 'PUT';
                // Si no se proporciona nueva contraseña, eliminar el campo
                if (!userData.password) {
                    delete userData.password;
                }
            }
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Error al procesar el usuario');
            }
            
            // Cerrar modal y resetear formulario
            modal.style.display = 'none';
            form.reset();
            
            // Mostrar mensaje de éxito
            mostrarMensaje(result.message || (usuarioEditando ? 'Usuario actualizado con éxito' : 'Usuario registrado con éxito'), 'success');
            
            // Recargar datos
            fetchUsuarios();
            
        } catch (error) {
            console.error('Error:', error);
            mostrarError(error.message || 'Error al procesar el usuario');
        }
    });
    
    // Editar usuario
    async function editarUsuario(id) {
        try {
            const response = await fetch(`http://localhost:8000/api/usuario/${id}`);
            
            if (!response.ok) {
                throw new Error('Error al cargar el usuario');
            }
            
            const result = await response.json();
            const usuario = result.data;
            
            usuarioEditando = id;
            
            // Llenar el formulario
            document.getElementById('nombre').value = usuario.nombre;
            document.getElementById('email').value = usuario.email;
            document.getElementById('rol').value = usuario.rol;
            document.getElementById('estado').value = usuario.estado;
            document.getElementById('password').value = ''; // Limpiar contraseña
            
            // Cambiar título del modal
            modalTitle.textContent = 'Editar Usuario';
            saveButton.textContent = 'Actualizar Usuario';
            
            // Mostrar modal
            modal.style.display = 'block';
            
        } catch (error) {
            console.error('Error:', error);
            mostrarError('Error al cargar el usuario para editar');
        }
    }
    
    // Confirmar eliminación
    confirmDeleteBtn.addEventListener('click', eliminarUsuario);
    
    // Event listeners para filtros
    filterRol.addEventListener('change', aplicarFiltros);
    filterEstado.addEventListener('change', aplicarFiltros);
    searchInput.addEventListener('input', aplicarFiltros);
    
    // Event listener para el botón de actualizar
    btnUpdate.addEventListener('click', fetchUsuarios);
});