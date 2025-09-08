document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos del DOM
    const modal = document.getElementById('canastillaModal');
    const modalTitle = document.getElementById('modal-title');
    const btnAddCanastilla = document.getElementById('btn-add-canastilla');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-button');
    const form = document.getElementById('canastilla-form');
    const inventarioBody = document.getElementById('inventario-body');
    const filterStatus = document.getElementById('filter-status');
    const filterLocation = document.getElementById('filter-location');
    const searchInput = document.getElementById('search');
    const btnUpdate = document.getElementById('btn-update');
    const saveButton = document.getElementById('save-button');
    
    // Variables de estado
    let canastillas = [];
    let canastillaEditando = null;

    // Cargar inventario al iniciar
    fetchInventario();

    // Función para cargar inventario desde la API
    const fetchInventario = async () => {
        try {
            mostrarCarga(true);
            console.log("Cargando inventario desde el servidor...");
            const response = await fetch('http://localhost:8000/api/inventario');
            
            // Verificar si la respuesta está vacía
            const responseText = await response.text();
            if (!responseText) {
                throw new Error('La respuesta del servidor está vacía');
            }
            
            if (!response.ok) {
                throw new Error('Error al cargar inventario: ' + response.status);
            }
            
            const data = JSON.parse(responseText);
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            canastillas = data.data || [];
            aplicarFiltros();
            
        } catch (error) {
            console.error('Error:', error);
            mostrarError('No se pudo cargar el inventario. Verifica la conexión con el servidor.');
        } finally {
            mostrarCarga(false);
        }
    };

    // Aplicar filtros al inventario
    function aplicarFiltros() {
        let canastillasFiltradas = [...canastillas];
        
        // Filtrar por estado
        if (filterStatus.value !== 'all') {
            canastillasFiltradas = canastillasFiltradas.filter(c => c.estado === filterStatus.value);
        }
        
        // Filtrar por ubicación
        if (filterLocation.value !== 'all') {
            canastillasFiltradas = canastillasFiltradas.filter(c => c.ubicacion === filterLocation.value);
        }
        
        // Filtrar por búsqueda
        if (searchInput.value) {
            const searchTerm = searchInput.value.toLowerCase();
            canastillasFiltradas = canastillasFiltradas.filter(c => 
                (c.id_canastilla && c.id_canastilla.toLowerCase().includes(searchTerm)) ||
                (c.ubicacion && c.ubicacion.toLowerCase().includes(searchTerm))
            );
        }
        
        cargarInventario(canastillasFiltradas);
        actualizarEstadisticas(canastillasFiltradas);
    }

    // Cargar inventario en la tabla
    function cargarInventario(canastillas) {
        inventarioBody.innerHTML = '';
        
        if (canastillas.length === 0) {
            inventarioBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px;">
                        <i class="fas fa-inbox" style="font-size: 48px; color: #ccc; margin-bottom: 10px;"></i>
                        <p>No se encontraron canastillas</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Mostrar canastillas en la tabla
        canastillas.forEach(canastilla => {
            const row = document.createElement('tr');
            
            // Formatear fecha
            const fechaFormateada = formatearFecha(canastilla.fecha_ultimo_movimiento);
            
            // Determinar clase para el badge según el estado
            let badgeClass = '';
            if (canastilla.estado === 'Disponible') badgeClass = 'disponible';
            if (canastilla.estado === 'En Tránsito') badgeClass = 'transito';
            if (canastilla.estado === 'En Reparación') badgeClass = 'mantenimiento';
            
            row.innerHTML = `
                <td>${canastilla.id_canastilla || 'N/A'}</td>
                <td><span class="badge ${badgeClass}">${canastilla.estado || 'N/A'}</span></td>
                <td>${canastilla.ubicacion || 'N/A'}</td>
                <td>${canastilla.usuario_asignado || 'N/A'}</td>
                <td>${fechaFormateada}</td>
                <td class="action-buttons">
                    <button class="btn-edit" data-id="${canastilla.id_canastilla}"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn-delete" data-id="${canastilla.id_canastilla}"><i class="fas fa-trash"></i> Eliminar</button>
                </td>
            `;
            
            inventarioBody.appendChild(row);
        });
        
        // Agregar event listeners a los botones de acción
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => editarCanastilla(btn.dataset.id));
        });
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => eliminarCanastilla(btn.dataset.id));
        });
    }
    
    // Función para formatear fechas
    function formatearFecha(fechaString) {
        if (!fechaString) return 'N/A';
        
        try {
            const fecha = new Date(fechaString);
            if (isNaN(fecha.getTime())) return 'Fecha inválida';
            
            return fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formateando fecha:', error);
            return 'N/A';
        }
    }
    
    // Actualizar estadísticas
    function actualizarEstadisticas(canastillas) {
        const total = canastillas.length;
        const disponibles = canastillas.filter(c => c.estado === 'Disponible').length;
        const transito = canastillas.filter(c => c.estado === 'En Tránsito').length;
        const mantenimiento = canastillas.filter(c => c.estado === 'En Reparación').length;
        
        document.getElementById('total-canastillas').textContent = total;
        document.getElementById('disponibles-count').textContent = disponibles;
        document.getElementById('transito-count').textContent = transito;
        document.getElementById('mantenimiento-count').textContent = mantenimiento;
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
    
    // Abrir modal para nueva canastilla
    btnAddCanastilla.addEventListener('click', () => {
        canastillaEditando = null;
        modalTitle.textContent = 'Nueva Canastilla';
        saveButton.textContent = 'Registrar Canastilla';
        form.reset();
        modal.style.display = 'block';
    });
    
    // Cerrar modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        form.reset();
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        form.reset();
    });
    
    // Cerrar modal al hacer clic fuera del contenido
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            form.reset();
        }
    });
    
    // Manejar envío del formulario
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const formData = new FormData(form);
        const canastillaData = {
            id_canastilla: formData.get('id_canastilla'),
            estado: formData.get('estado'),
            ubicacion: formData.get('ubicacion')
        };
        
        try {
            let url = 'http://localhost:8000/api/canastilla/add';
            let method = 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(canastillaData)
            });
            
            // Verificar si la respuesta está vacía
            const responseText = await response.text();
            if (!responseText) {
                throw new Error('La respuesta del servidor está vacía');
            }
            
            const result = JSON.parse(responseText);
            
            if (!response.ok) {
                throw new Error(result.error || 'Error al procesar la canastilla');
            }
            
            // Cerrar modal y resetear formulario
            modal.style.display = 'none';
            form.reset();
            
            // Mostrar mensaje de éxito
            mostrarMensaje(result.message || 'Canastilla registrada con éxito', 'success');
            
            // Recargar datos después de guardar
            setTimeout(() => {
                fetchInventario();
            }, 500);
            
        } catch (error) {
            console.error('Error:', error);
            mostrarError(error.message || 'Error al procesar la canastilla');
        }
    });
    
    // Editar canastilla
    async function editarCanastilla(id) {
        try {
            // En una implementación real, haríamos una llamada a la API
            // para obtener los datos específicos de la canastilla
            const canastilla = canastillas.find(c => c.id_canastilla === id);
            
            if (!canastilla) {
                throw new Error('Canastilla no encontrada');
            }
            
            canastillaEditando = id;
            
            // Llenar el formulario
            document.getElementById('id-canastilla').value = canastilla.id_canastilla;
            document.getElementById('estado').value = canastilla.estado;
            document.getElementById('ubicacion').value = canastilla.ubicacion;
            
            // Cambiar título del modal
            modalTitle.textContent = 'Editar Canastilla';
            saveButton.textContent = 'Actualizar Canastilla';
            
            // Mostrar modal
            modal.style.display = 'block';
            
        } catch (error) {
            console.error('Error:', error);
            mostrarError('Error al cargar la canastilla para editar');
        }
    }
    
    // Eliminar canastilla
    async function eliminarCanastilla(id) {
        if (!confirm(`¿Estás seguro de que quieres eliminar la canastilla ${id}? Esta acción no se puede deshacer.`)) {
            return;
        }
        
        try {
            // En una implementación real, haríamos una llamada a la API para eliminar
            // Por ahora, solo eliminamos del array local
            canastillas = canastillas.filter(c => c.id_canastilla !== id);
            
            // Mostrar mensaje de éxito
            mostrarMensaje(`Canastilla ${id} eliminada con éxito`, 'success');
            
            // Recargar datos
            aplicarFiltros();
            
        } catch (error) {
            console.error('Error:', error);
            mostrarError('Error al eliminar la canastilla');
        }
    }
    
    // Event listeners para filtros
    filterStatus.addEventListener('change', aplicarFiltros);
    filterLocation.addEventListener('change', aplicarFiltros);
    searchInput.addEventListener('input', aplicarFiltros);
    
    // Event listener para el botón de actualizar
    btnUpdate.addEventListener('click', fetchInventario);
    
    // Cargar datos iniciales
    fetchInventario();
});