export interface CSVContact {
  customer_name?: string;
  customer_phone: string;
  customer_email?: string;
  priority?: number;
  initial_message?: string;
}

export interface ParseResult {
  contacts: CSVContact[];
  errors: string[];
}

export const parseCSV = (csvText: string): ParseResult => {
  const lines = csvText.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV deve conter pelo menos um cabeçalho e uma linha de dados');
  }

  // Extrair cabeçalho
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // Validar colunas obrigatórias
  const phoneIndex = headers.findIndex(h => 
    h.includes('phone') || h.includes('telefone') || h.includes('celular')
  );
  
  if (phoneIndex === -1) {
    throw new Error('CSV deve conter uma coluna de telefone (phone, telefone ou celular)');
  }

  // Mapear índices das colunas
  const nameIndex = headers.findIndex(h => 
    h.includes('name') || h.includes('nome')
  );
  
  const emailIndex = headers.findIndex(h => 
    h.includes('email') || h.includes('e-mail')
  );
  
  const priorityIndex = headers.findIndex(h => 
    h.includes('priority') || h.includes('prioridade')
  );
  
  const messageIndex = headers.findIndex(h => 
    h.includes('message') || h.includes('mensagem') || h.includes('initial')
  );

  // Processar linhas de dados
  const contacts: CSVContact[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Pular linhas vazias

    const values = line.split(',').map(v => v.trim());

    // Validar telefone
    const phone = values[phoneIndex]?.replace(/\D/g, '');
    if (!phone || phone.length < 10) {
      errors.push(`Linha ${i + 1}: Telefone inválido "${values[phoneIndex]}"`);
      continue;
    }

    // Validar email (se fornecido)
    const email = emailIndex !== -1 ? values[emailIndex] : undefined;
    if (email && !isValidEmail(email)) {
      errors.push(`Linha ${i + 1}: Email inválido "${email}"`);
      continue;
    }

    contacts.push({
      customer_phone: `+55${phone}`, // Assumir Brasil
      customer_name: nameIndex !== -1 ? values[nameIndex] : undefined,
      customer_email: email,
      priority: priorityIndex !== -1 ? parseInt(values[priorityIndex]) || 0 : 0,
      initial_message: messageIndex !== -1 ? values[messageIndex] : undefined,
    });
  }

  if (contacts.length === 0) {
    throw new Error('Nenhum contato válido encontrado no CSV');
  }

  return { contacts, errors };
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const generateCSVTemplate = (): string => {
  return `name,phone,email,priority,initial_message
João Silva,11999887766,joao@example.com,0,"Olá João! Temos uma oportunidade especial para você..."
Maria Santos,11988776655,maria@example.com,1,"Oi Maria! Vi seu interesse em nossos serviços..."
Pedro Costa,11977665544,pedro@example.com,0,"Pedro, preparamos uma proposta exclusiva para você!"`;
};

export const downloadCSVTemplate = () => {
  const template = generateCSVTemplate();
  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'template_contatos.csv');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
