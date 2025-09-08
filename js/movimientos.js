document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos del DOM
    const modal = document.getElementById('movimientoModal');
    const modalTitle = document.getElementById('modal-title');
    const btnAddMovimiento = document.getElementById('btn-add-movimiento');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-button');
    const form = document.getElementById('movimiento-form');
    const movimientosBody = document.getElementById('movimientos-body');
    const filterType = document.getElementById('filter-type');
    const filterDate = document.getElementById('filter-date');
    const searchInput = document.getElementById('search');
    const canastillaSelect = document.getElementById('id-canastilla');
    const btnUpdate = document.getElementById('btn-update');
    const saveButton = document.getElementById('save-button');
    
    // Variables de estado
    let movimientos = [];
    let canastillas = [];
    let movimientoEditando = null;

    // Función para cargar movimientos desde la API
    const fetchMovimientos = async () => {
        try {
            console.log("Cargando movimientos desde el servidor...");
            const response = await fetch('http://localhost:8000/api/movimientos');
            
            // Verificar si la respuesta está vacía
            const responseText = await response.text();
            if (!responseText) {
                throw new Error('La respuesta del servidor está vacía');
            }
            
            if (!response.ok) {
                throw new Error('Error al cargar movimientos: ' + response.status);
            }
            
            const data = JSON.parse(responseText);
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            movimientos = data.data || [];
            cargarMovimientos();
            
        } catch (error) {
            console.error('Error:', error);
            mostrarError('No se pudieron cargar los movimientos. Verifica la conexión con el servidor.');
        }
    };

    // Función para cargar canastillas desde la API
    const fetchCanastillas = async () => {
        try {
            console.log("Cargando canastillas desde el servidor...");
            const response = await fetch('http://localhost:8000/api/inventario');
            
            // Verificar si la respuesta está vacía
            const responseText = await response.text();
            if (!responseText) {
                throw new Error('La respuesta del servidor está vacía');
            }
            
            if (!response.ok) {
                throw new Error('Error al cargar canastillas: ' + response.status);
            }
            
            const data = JSON.parse(responseText);
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            canastillas = data.data.map(item => item.id_canastilla) || [];
            
        } catch (error) {
            console.error('Error:', error);
            mostrarError('No se pudieron cargar las canastillas.');
        }
    };

    // Función para recargar la página (llamada desde el botón de actualizar)
    const recargarPagina = () => {
        console.log("Recargando página...");
        
        // Mostrar animación de carga en el botón
        const icon = btnUpdate.querySelector('i');
        icon.classList.add('fa-spin');
        
        // Deshabilitar el botón temporalmente
        btnUpdate.disabled = true;
        
        // Cambiar texto temporalmente
        const originalText = btnUpdate.innerHTML;
        btnUpdate.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Recargando...';
        
        // Recargar la página después de un breve delay para que se vea la animación
        setTimeout(() => {
            location.reload();
        }, 500);
    };

    // Cargar opciones de canastillas en el select
    function cargarOpcionesCanastillas() {
        canastillaSelect.innerHTML = '<option value="">Seleccione una canastilla</option>';
        canastillas.forEach(canastilla => {
            const option = document.createElement('option');
            option.value = canastilla;
            option.textContent = canastilla;
            canastillaSelect.appendChild(option);
        });
    }

    // Cargar movimientos en la tabla
    function cargarMovimientos() {
        movimientosBody.innerHTML = '';
        
        if (movimientos.length === 0) {
            movimientosBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 20px;">
                        <i class="fas fa-inbox" style="font-size: 48px; color: #ccc; margin-bottom: 10px;"></i>
                        <p>No hay movimientos registrados</p>
                    </td>
                </tr>
            `;
            actualizarEstadisticas([]);
            return;
        }
        
        // Aplicar filtros
        let movimientosFiltrados = [...movimientos];
        
        if (filterType.value !== 'all') {
            movimientosFiltrados = movimientosFiltrados.filter(m => m.tipo_movimiento === filterType.value);
        }
        
        if (filterDate.value !== 'all') {
            const hoy = new Date();
            movimientosFiltrados = movimientosFiltrados.filter(m => {
                if (!m.fecha_movimiento) return false;
                
                const fechaMovimiento = new Date(m.fecha_movimiento);
                if (isNaN(fechaMovimiento.getTime())) return false;
                
                switch(filterDate.value) {
                    case 'today':
                        return fechaMovimiento.toDateString() === hoy.toDateString();
                    case 'week':
                        const inicioSemana = new Date(hoy);
                        inicioSemana.setDate(hoy.getDate() - hoy.getDay());
                        inicioSemana.setHours(0, 0, 0, 0);
                        return fechaMovimiento >= inicioSemana;
                    case 'month':
                        return fechaMovimiento.getMonth() === hoy.getMonth() && 
                               fechaMovimiento.getFullYear() === hoy.getFullYear();
                    default:
                        return true;
                }
            });
        }
        
        if (searchInput.value) {
            const searchTerm = searchInput.value.toLowerCase();
            movimientosFiltrados = movimientosFiltrados.filter(m => 
                (m.id_canastilla && m.id_canastilla.toLowerCase().includes(searchTerm)) ||
                (m.ubicacion_origen && m.ubicacion_origen.toLowerCase().includes(searchTerm)) ||
                (m.ubicacion_destino && m.ubicacion_destino.toLowerCase().includes(searchTerm)) ||
                (m.usuario_responsable && m.usuario_responsable.toLowerCase().includes(searchTerm))
            );
        }
        
        // Actualizar estadísticas
        actualizarEstadisticas(movimientosFiltrados);
        
        // Mostrar movimientos en la tabla
        movimientosFiltrados.forEach(movimiento => {
            const row = document.createElement('tr');
            
            // Formatear fecha
            const fechaFormateada = formatearFecha(movimiento.fecha_movimiento);
            
            // Determinar clase para el badge según el tipo
            const badgeClass = movimiento.tipo_movimiento === 'entrada' ? 'entrada' : 'salida';
            const badgeText = movimiento.tipo_movimiento === 'entrada' ? 'Entrada' : 'Salida';
            
            row.innerHTML = `
                <td>${movimiento.id_movimiento || 'N/A'}</td>
                <td>${movimiento.id_canastilla || 'N/A'}</td>
                <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                <td>${movimiento.ubicacion_origen || 'N/A'}</td>
                <td>${movimiento.ubicacion_destino || 'N/A'}</td>
                <td>${movimiento.usuario_responsable || 'N/A'}</td>
                <td>${fechaFormateada}</td>
                <td class="action-buttons">
                    <button class="btn-edit" data-id="${movimiento.id_movimiento}"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn-delete" data-id="${movimiento.id_movimiento}"><i class="fas fa-trash"></i> Eliminar</button>
                </td>
            `;
            
            movimientosBody.appendChild(row);
        });
        
        // Agregar event listeners a los botones de acción
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => editarMovimiento(parseInt(btn.dataset.id)));
        });
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => eliminarMovimiento(parseInt(btn.dataset.id)));
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
    function actualizarEstadisticas(movimientos) {
        const total = movimientos.length;
        const entradas = movimientos.filter(m => m.tipo_movimiento === 'entrada').length;
        const salidas = movimientos.filter(m => m.tipo_movimiento === 'salida').length;
        
        // Contar movimientos de hoy
        const hoy = new Date();
        const hoyCount = movimientos.filter(m => {
            if (!m.fecha_movimiento) return false;
            
            try {
                const fechaMovimiento = new Date(m.fecha_movimiento);
                return !isNaN(fechaMovimiento.getTime()) && fechaMovimiento.toDateString() === hoy.toDateString();
            } catch (error) {
                return false;
            }
        }).length;
        
        document.getElementById('total-movimientos').textContent = total;
        document.getElementById('entradas-count').textContent = entradas;
        document.getElementById('salidas-count').textContent = salidas;
        document.getElementById('hoy-count').textContent = hoyCount;
    }
    
    // Función para mostrar errores
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
    
    // Función para mostrar mensajes de éxito
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
    
    // Abrir modal para nuevo movimiento
    btnAddMovimiento.addEventListener('click', async () => {
        try {
            await fetchCanastillas();
            cargarOpcionesCanastillas();
            movimientoEditando = null;
            modalTitle.textContent = 'Nuevo Movimiento';
            saveButton.textContent = 'Registrar Movimiento';
            form.reset();
            modal.style.display = 'block';
        } catch (error) {
            console.error('Error al abrir modal:', error);
            mostrarError('Error al cargar las canastillas');
        }
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
        const movimientoData = {
            id_canastilla: formData.get('id_canastilla'),
            tipo_movimiento: formData.get('tipo_movimiento'),
            ubicacion_origen: formData.get('ubicacion_origen'),
            ubicacion_destino: formData.get('ubicacion_destino'),
            id_usuario_responsable: parseInt(formData.get('id_usuario_responsable'))
        };
        
        try {
            let url = 'http://localhost:8000/api/movimiento/add';
            let method = 'POST';
            
            // Si estamos editando, cambiar la URL y el método
            if (movimientoEditando) {
                url = `http://localhost:8000/api/movimiento/${movimientoEditando}`;
                method = 'PUT';
            }
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(movimientoData)
            });
            
            // Verificar si la respuesta está vacía
            const responseText = await response.text();
            if (!responseText) {
                throw new Error('La respuesta del servidor está vacía');
            }
            
            const result = JSON.parse(responseText);
            
            if (!response.ok) {
                throw new Error(result.error || 'Error al procesar el movimiento');
            }
            
            // Cerrar modal y resetear formulario
            modal.style.display = 'none';
            form.reset();
            
            // Mostrar mensaje de éxito
            mostrarMensaje(result.message || (movimientoEditando ? 'Movimiento actualizado con éxito' : 'Movimiento registrado con éxito'), 'success');
            
            // Recargar datos después de guardar
            setTimeout(() => {
                fetchMovimientos();
            }, 500);
            
        } catch (error) {
            console.error('Error:', error);
            mostrarError(error.message || 'Error al procesar el movimiento');
        }
    });
    
    // Editar movimiento
    async function editarMovimiento(id) {
        try {
            const response = await fetch(`http://localhost:8000/api/movimiento/${id}`);
            
            // Verificar si la respuesta está vacía
            const responseText = await response.text();
            if (!responseText) {
                throw new Error('La respuesta del servidor está vacía');
            }
            
            if (!response.ok) {
                throw new Error('Error al cargar el movimiento: ' + response.status);
            }
            
            const result = JSON.parse(responseText);
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            // Llenar el formulario con los datos del movimiento
            const movimiento = result.data;
            movimientoEditando = id;
            
            await fetchCanastillas();
            cargarOpcionesCanastillas();
            
            // Corregido: usar los IDs correctos de los elementos del formulario
            document.getElementById('id-canastilla').value = movimiento.id_canastilla;
            document.getElementById('tipo-movimiento').value = movimiento.tipo_movimiento;
            document.getElementById('ubicacion-origen').value = movimiento.ubicacion_origen;
            document.getElementById('ubicacion-destino').value = movimiento.ubicacion_destino;
            document.getElementById('usuario-responsable').value = movimiento.id_usuario_responsable;
            
            // Cambiar título del modal y texto del botón
            modalTitle.textContent = 'Editar Movimiento';
            saveButton.textContent = 'Actualizar Movimiento';
            
            // Mostrar modal
            modal.style.display = 'block';
            
        } catch (error) {
            console.error('Error:', error);
            mostrarError(error.message || 'Error al cargar el movimiento para editar');
        }
    }
    
    // Eliminar movimiento
    async function eliminarMovimiento(id) {
        if (!confirm(`¿Estás seguro de que quieres eliminar el movimiento ${id}? Esta acción no se puede deshacer.`)) {
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:8000/api/movimiento/${id}`, {
                method: 'DELETE'
            });
            
            // Verificar si la respuesta está vacía
            const responseText = await response.text();
            if (!responseText) {
                throw new Error('La respuesta del servidor está vacía');
            }
            
            const result = JSON.parse(responseText);
            
            if (!response.ok) {
                throw new Error(result.error || 'Error al eliminar el movimiento');
            }
            
            // Mostrar mensaje de éxito
            mostrarMensaje(result.message || 'Movimiento eliminado con éxito', 'success');
            
            // Recargar datos después de eliminar
            setTimeout(() => {
                fetchMovimientos();
            }, 500);
            
        } catch (error) {
            console.error('Error:', error);
            mostrarError(error.message || 'Error al eliminar el movimiento');
        }
    }
    
    // Event listeners para filtros
    filterType.addEventListener('change', cargarMovimientos);
    filterDate.addEventListener('change', cargarMovimientos);
    searchInput.addEventListener('input', cargarMovimientos);
    
    // Event listener para el botón de actualizar - ahora recarga la página
    btnUpdate.addEventListener('click', recargarPagina);
    
    // Cargar datos iniciales
    fetchMovimientos();
});