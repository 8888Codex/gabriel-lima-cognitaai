interface Contact {
  name: string;
  phone: string;
  email?: string;
  [key: string]: string | undefined;
}

interface ParseResult {
  contacts: Contact[];
  isValid: boolean;
  errorMessage?: string;
}

export const parseCSV = async (file: File): Promise<ParseResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
          resolve({
            contacts: [],
            isValid: false,
            errorMessage: "Arquivo CSV vazio"
          });
          return;
        }

        // Parse header
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Validate required columns
        const hasName = headers.includes('name') || headers.includes('nome');
        const hasPhone = headers.includes('phone') || headers.includes('telefone');
        const hasEmail = headers.includes('email') || headers.includes('e-mail');

        if (!hasName || !hasPhone) {
          resolve({
            contacts: [],
            isValid: false,
            errorMessage: "CSV deve conter colunas 'nome' e 'telefone'"
          });
          return;
        }

        // Get column indices
        const nameIndex = headers.findIndex(h => h === 'name' || h === 'nome');
        const phoneIndex = headers.findIndex(h => h === 'phone' || h === 'telefone');
        const emailIndex = headers.findIndex(h => h === 'email' || h === 'e-mail');

        // Parse contacts
        const contacts: Contact[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          
          if (values.length > nameIndex && values.length > phoneIndex) {
            const name = values[nameIndex];
            const phone = values[phoneIndex];
            const email = emailIndex !== -1 && values.length > emailIndex ? values[emailIndex] : '';

            if (name && phone) {
              const contact: Contact = { name, phone };
              if (email) {
                contact.email = email;
              }
              contacts.push(contact);
            }
          }
        }

        if (contacts.length === 0) {
          resolve({
            contacts: [],
            isValid: false,
            errorMessage: "Nenhum contato válido encontrado no arquivo"
          });
          return;
        }

        resolve({
          contacts,
          isValid: true
        });
      } catch (error) {
        resolve({
          contacts: [],
          isValid: false,
          errorMessage: "Erro ao processar arquivo CSV"
        });
      }
    };

    reader.onerror = () => {
      resolve({
        contacts: [],
        isValid: false,
        errorMessage: "Erro ao ler arquivo"
      });
    };

    reader.readAsText(file);
  });
};
