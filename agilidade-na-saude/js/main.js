const btnMobile = document.getElementById('btn-mobile');

function toggleMenu(event) {
    if (event.type === 'touchstart') event.preventDefault();

    const nav = document.getElementById('nav');
    nav.classList.toggle('active');

    const active = nav.classList.contains('active');
    event.currentTarget.setAttribute('aria-expanded', active);

    if (active) {
        event.currentTarget.setAttribute('aria-label', 'Fechar Menu');
    }
    else {
        event.currentTarget.setAttribute('aria-label', 'Abrir Menu');
    }
}

btnMobile.addEventListener('click', toggleMenu);
btnMobile.addEventListener('touchstart', toggleMenu);

// Helpers
function getServices() {
    return JSON.parse(localStorage.getItem('services') || '[]');
}

function saveServices(services) {
    localStorage.setItem('services', JSON.stringify(services));
}

function showAlert(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    const toastId = 'toast-' + Date.now();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0 show`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.id = toastId;
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>

            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove o toast após 5 segundos
    setTimeout(() => {
        const bsToast = bootstrap.Toast.getOrCreateInstance(toast);
        bsToast.hide();
        toast.addEventListener('hidden.bs.toast', () => toast.remove());
    }, 5000);
}

// Validação para data e hora
function isFutureDate(dateStr, timeStr) {
    const [year, month, day] = dateStr.split('-');
    const [hour, minute] = timeStr.split(':');
    const selectedDate = new Date(year, month - 1, day, hour, minute);
    const now = new Date();
    return selectedDate > now;
}

// Renderização dos serviços (atualizada)
function renderServices() {
    const services = getServices();
    const servicesList = document.getElementById('servicesList');
    servicesList.innerHTML = '';

    if (services.length === 0) {
        servicesList.innerHTML = '<p class="text-center text-muted">Nenhum serviço cadastrado ainda.</p>';
        return;
    }

    services.forEach((service, index) => {
        const pacientesAtendidos = service.tokens.filter(t => t.used).length;
        const serviceCard = document.createElement('div');
        serviceCard.className = 'col-md-4 mb-4';
        serviceCard.innerHTML = `
        <div class="card shadow-sm h-100">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${service.name}</h5>
            <p class="card-text">
              <span class="badge bg-primary">Data:</span> ${service.date}<br>
              <span class="badge bg-primary">Início:</span> ${service.time}<br>
              <span class="badge bg-success">Senhas:</span> ${service.availableTokens}/${service.totalTokens}<br>
              <span class="badge bg-info">Tempo Médio:</span> ${service.avgTime} min<br><br>
              ${service.description}
            </p>
            <div class="mt-auto">
              <button class="btn btn-success btn-sm w-100 mb-2" onclick="collectToken(${index})" ${service.availableTokens === 0 ? 'disabled' : ''}>
                Pegar Senha
              </button>
              <button class="btn btn-info btn-sm w-100 mb-2" onclick="listarPacientes(${index})" ${pacientesAtendidos === 0 ? 'disabled' : ''}>
                Pacientes (${pacientesAtendidos})
              </button>
              <button class="btn btn-warning btn-sm w-100 mb-2" onclick="openEditModal(${index})">
                Editar
              </button>
              <button class="btn btn-danger btn-sm w-100" onclick="deleteService(${index})">
                Excluir
              </button>
            </div>
          </div>
        </div>
      `;
        servicesList.appendChild(serviceCard);
    });
}

// Listar pacientes (função atualizada)
function listarPacientes(index) {
    const services = getServices();
    const pacientes = services[index].tokens
        .filter(t => t.used)
        .map(token => ({
            senha: token.number,
            nome: token.patientName,
            documento: token.patientDocument
        }));

    const listaPacientes = document.getElementById('listaPacientes');
    listaPacientes.innerHTML = '';

    if (pacientes.length === 0) {
        listaPacientes.innerHTML = '<tr><td colspan="3" class="text-center">Nenhum paciente atendido ainda</td></tr>';
    } else {
        pacientes.forEach(paciente => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${paciente.senha}</td>
                <td>${paciente.nome}</td>
                <td>${paciente.documento}</td>
            `;
            listaPacientes.appendChild(row);
        });
    }

    // Atualiza o título do modal com o nome do serviço
    document.querySelector('#modalPacientes .modal-title').textContent = 
        `Pacientes - ${services[index].name}`;

    new bootstrap.Modal(document.getElementById('modalPacientes')).show();
}

// Criar novo serviço
document.getElementById('serviceForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const services = getServices();
    const name = document.getElementById('name').value.trim();
    const totalTokens = parseInt(document.getElementById('totalTokens').value);
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const avgTime = parseInt(document.getElementById('avgTime').value);
    const description = document.getElementById('description').value.trim();

    if (!isFutureDate(date, time)) {
        showAlert('A data e hora devem ser futuras.', 'danger');
        return;
    }

    const newService = {
        name,
        totalTokens,
        availableTokens: totalTokens,
        date,
        time,
        avgTime,
        description,
        tokens: gerarTokens(totalTokens) // Adicionando a funcionalidade de tokens
    };

    services.push(newService);
    saveServices(services);
    this.reset();
    showAlert('Serviço criado com sucesso!');
    renderServices();
});

// Função para gerar tokens (nova funcionalidade)
function gerarTokens(qtd, startFrom = 1) {
    const tokens = [];
    for (let i = startFrom; i < startFrom + qtd; i++) {
        tokens.push({
            number: "#" + i.toString().padStart(3, '0'),
            used: false,
            patientName: "",
            patientDocument: ""
        });
    }
    return tokens;
}

// Coletar senha (versão atualizada com modal de coleta)
function collectToken(index) {
    document.getElementById("indexServicoSelecionado").value = index;
    document.getElementById("nomePaciente").value = "";
    document.getElementById("documentoPaciente").value = "";
    
    const services = getServices();
    if (services[index].availableTokens === 0) {
        showAlert("Todas as senhas já foram utilizadas.", "danger");
        return;
    }
    new bootstrap.Modal(document.getElementById("modalColetarSenha")).show();
}

// Formulário de coleta de senha (nova funcionalidade)
document.getElementById('formColetarSenha').addEventListener('submit', function(e) {
    e.preventDefault();
    const index = document.getElementById("indexServicoSelecionado").value;
    const services = getServices();
    const nome = document.getElementById("nomePaciente").value;
    const doc = document.getElementById("documentoPaciente").value;

    // Encontra o primeiro token não utilizado
    const tokenDisponivel = services[index].tokens.find(t => !t.used);
    
    if (tokenDisponivel) {
        tokenDisponivel.used = true;
        tokenDisponivel.patientName = nome;
        tokenDisponivel.patientDocument = doc;
        
        // Atualiza o contador de senhas disponíveis
        services[index].availableTokens--;
        
        saveServices(services);
        renderServices();
        bootstrap.Modal.getInstance(document.getElementById("modalColetarSenha")).hide();
        showAlert(`Senha gerada: ${tokenDisponivel.number}`, 'success');
    }
});

// Abrir modal para edição
function openEditModal(index) {
    const services = getServices();
    const service = services[index];

    document.getElementById('editIndex').value = index;
    document.getElementById('editName').value = service.name;
    document.getElementById('editTotalTokens').value = service.totalTokens;
    document.getElementById('editDate').value = service.date;
    document.getElementById('editTime').value = service.time;
    document.getElementById('editAvgTime').value = service.avgTime;
    document.getElementById('editDescription').value = service.description;

    new bootstrap.Modal(document.getElementById('editModal')).show();
}

// Atualizar serviço (versão corrigida)
document.getElementById('editForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const index = document.getElementById('editIndex').value;
    const services = getServices();
    const service = services[index];
    
    const name = document.getElementById('editName').value.trim();
    const totalTokens = parseInt(document.getElementById('editTotalTokens').value);
    const date = document.getElementById('editDate').value;
    const time = document.getElementById('editTime').value;
    const avgTime = parseInt(document.getElementById('editAvgTime').value);
    const description = document.getElementById('editDescription').value.trim();

    // Validação: Não permitir reduzir número de senhas
    const senhasUtilizadas = service.totalTokens - service.availableTokens;
    if (totalTokens < service.totalTokens) {
        showAlert(`Não é possível reduzir o número de senhas. Já foram utilizadas ${senhasUtilizadas} senhas.`, 'danger');
        return;
    }

    if (!isFutureDate(date, time)) {
        showAlert('A data e hora devem ser futuras.', 'danger');
        return;
    }

    // Calcula a diferença de senhas para adicionar novos tokens se necessário
    const diff = totalTokens - service.totalTokens;
    let newAvailableTokens = service.availableTokens;
    
    if (diff > 0) {
        // Encontra o último número de senha usado
        const lastTokenNumber = service.tokens.reduce((max, token) => {
            const num = parseInt(token.number.substring(1));
            return num > max ? num : max;
        }, 0);
        
        // Gera novos tokens continuando a numeração
        const novosTokens = gerarTokens(diff, lastTokenNumber + 1);
        service.tokens = [...service.tokens, ...novosTokens];
        newAvailableTokens = service.availableTokens + diff;
    }

    // Atualiza o serviço
    services[index] = {
        ...service,
        name,
        totalTokens,
        availableTokens: newAvailableTokens,
        date,
        time,
        avgTime,
        description
    };

    saveServices(services);
    renderServices();
    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
    showAlert('Serviço atualizado com sucesso!');
});

// Excluir serviço
function deleteService(index) {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
        const services = getServices();
        services.splice(index, 1);
        saveServices(services);
        showAlert('Serviço excluído com sucesso!', 'warning');
        renderServices();
    }
}

// Inicializar página
renderServices();