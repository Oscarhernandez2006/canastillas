document.addEventListener('DOMContentLoaded', function() {
    // Variables globales para los gráficos
    let tendenciaChart = null;
    let barChart = null;
    
    // Función para obtener datos reales de la API
    const fetchDashboardData = async () => {
        try {
            // Mostrar estado de carga
            mostrarEstadoCarga(true);
            
            const response = await fetch('http://localhost:8000/api/dashboard/metrics');
            if (!response.ok) {
                throw new Error('La respuesta de la red no fue exitosa. Código: ' + response.status);
            }
            const data = await response.json();

            // Verificar si la respuesta tiene error
            if (data.error) {
                throw new Error(data.error);
            }

            // Actualizar métricas en la interfaz con datos reales
            actualizarMetricas(data);
            
            // Crear o actualizar gráficos
            actualizarGraficos(data);
            
            // Mostrar movimientos recientes si existen en la respuesta
            if (data.movimientos_recientes && data.movimientos_recientes.length > 0) {
                mostrarMovimientosRecientes(data.movimientos_recientes);
            }
            
            // Ocultar estado de carga
            mostrarEstadoCarga(false);
            
        } catch (error) {
            console.error('Error al obtener los datos del dashboard:', error);
            mostrarError('No se pudieron cargar los datos. Verifica la conexión con el servidor.');
            mostrarEstadoCarga(false);
        }
    };

    // Función para actualizar las métricas
    function actualizarMetricas(data) {
        document.getElementById('total-canastillas').textContent = data.total;
        document.getElementById('canastillas-disponibles').textContent = data.disponibles;
        document.getElementById('canastillas-movimiento').textContent = data.en_movimiento;
        document.getElementById('canastillas-mantenimiento').textContent = data.en_mantenimiento;
    }

    // Función para actualizar los gráficos
    function actualizarGraficos(data) {
        const tendenciaCtx = document.getElementById('tendencia-uso').getContext('2d');
        const barCtx = document.getElementById('barChart').getContext('2d');
        
        // Destruir gráficos existentes si los hay
        if (tendenciaChart) {
            tendenciaChart.destroy();
        }
        if (barChart) {
            barChart.destroy();
        }
        
        // Crear gráfico de tendencia
        tendenciaChart = new Chart(tendenciaCtx, {
            type: 'line',
            data: {
                labels: data.grafico_tendencia.labels,
                datasets: [{
                    label: 'Movimientos mensuales',
                    data: data.grafico_tendencia.data,
                    borderColor: '#1e3c72',
                    backgroundColor: 'rgba(30, 60, 114, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#1e3c72',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Movimientos: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        title: {
                            display: true,
                            text: 'Cantidad de Movimientos'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Meses'
                        }
                    }
                }
            }
        });

        // Crear gráfico de barras
        barChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: data.grafico_barras.labels,
                datasets: [{
                    label: 'Cantidad de Canastillas',
                    data: data.grafico_barras.data,
                    backgroundColor: [
                        'rgba(76, 175, 80, 0.7)',
                        'rgba(33, 150, 243, 0.7)',
                        'rgba(255, 152, 0, 0.7)',
                        'rgba(156, 39, 176, 0.7)',
                        'rgba(244, 67, 54, 0.7)',
                        'rgba(0, 188, 212, 0.7)',
                        'rgba(255, 87, 34, 0.7)'
                    ],
                    borderColor: [
                        'rgb(76, 175, 80)',
                        'rgb(33, 150, 243)',
                        'rgb(255, 152, 0)',
                        'rgb(156, 39, 176)',
                        'rgb(244, 67, 54)',
                        'rgb(0, 188, 212)',
                        'rgb(255, 87, 34)'
                    ],
                    borderWidth: 1,
                    borderRadius: 4,
                    hoverBackgroundColor: [
                        'rgba(76, 175, 80, 0.9)',
                        'rgba(33, 150, 243, 0.9)',
                        'rgba(255, 152, 0, 0.9)',
                        'rgba(156, 39, 176, 0.9)',
                        'rgba(244, 67, 54, 0.9)',
                        'rgba(0, 188, 212, 0.9)',
                        'rgba(255, 87, 34, 0.9)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Canastillas: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        title: {
                            display: true,
                            text: 'Cantidad de Canastillas'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Ubicaciones'
                        }
                    }
                }
            }
        });
    }

    // Función para mostrar movimientos recientes
    function mostrarMovimientosRecientes(movimientos) {
        const movimientosContainer = document.getElementById('movimientos-recientes');
        if (!movimientosContainer) return;

        movimientosContainer.innerHTML = '';
        
        movimientos.forEach(movimiento => {
            const movimientoElement = document.createElement('div');
            movimientoElement.className = 'movimiento-item';
            movimientoElement.innerHTML = `
                <div class="movimiento-icono ${movimiento.tipo_movimiento === 'entrada' ? 'entrada' : 'salida'}">
                    <i class="fas ${movimiento.tipo_movimiento === 'entrada' ? 'fa-sign-in-alt' : 'fa-sign-out-alt'}"></i>
                </div>
                <div class="movimiento-info">
                    <p class="movimiento-titulo">${movimiento.tipo_movimiento === 'entrada' ? 'Entrada' : 'Salida'} de canastilla ${movimiento.id_canastilla}</p>
                    <p class="movimiento-detalle">${movimiento.ubicacion_origen} → ${movimiento.ubicacion_destino}</p>
                    <p class="movimiento-usuario">Por: ${movimiento.usuario_responsable || 'Usuario'}</p>
                    <p class="movimiento-fecha">${formatearFecha(movimiento.fecha_movimiento)}</p>
                </div>
            `;
            movimientosContainer.appendChild(movimientoElement);
        });
    }

    // Función para formatear fechas
    function formatearFecha(fechaString) {
        const fecha = new Date(fechaString);
        return fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Función para mostrar estado de carga
    function mostrarEstadoCarga(mostrar) {
        let btnRecargar = document.getElementById('btn-recargar');
        
        if (mostrar) {
            // Mostrar spinner de carga
            btnRecargar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
            btnRecargar.disabled = true;
        } else {
            // Restaurar botón normal
            btnRecargar.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar';
            btnRecargar.disabled = false;
        }
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

    // Configurar el botón de recarga
    function configurarBotonRecarga() {
        const btnRecargar = document.getElementById('btn-recargar');
        if (btnRecargar) {
            btnRecargar.addEventListener('click', function() {
                fetchDashboardData();
                
                // Efecto visual de rotación
                this.classList.add('rotating');
                setTimeout(() => {
                    this.classList.remove('rotating');
                }, 1000);
            });
        }
    }

    // Filtros de gráficos (si los tienes en tu HTML)
    function configurarFiltros() {
        const tendenciaFilter = document.getElementById('tendencia-filter');
        const ubicacionFilter = document.getElementById('ubicacion-filter');
        
        if (tendenciaFilter) {
            tendenciaFilter.addEventListener('change', function(e) {
                console.log('Filtrar tendencia por:', e.target.value);
                fetchDashboardData();
            });
        }
        
        if (ubicacionFilter) {
            ubicacionFilter.addEventListener('change', function(e) {
                console.log('Filtrar ubicación por:', e.target.value);
                fetchDashboardData();
            });
        }
    }

    // Inicializar la aplicación
    function inicializar() {
        configurarBotonRecarga();
        configurarFiltros();
        fetchDashboardData();
    }

    // Iniciar la aplicación
    inicializar();

    // Actualizar datos periódicamente (cada 60 segundos)
    const intervaloActualizacion = setInterval(fetchDashboardData, 60000);

    // Limpiar intervalo cuando la página se cierre
    window.addEventListener('beforeunload', () => {
        clearInterval(intervaloActualizacion);
    });
});