const sendEmail = async (options) => {
    console.log('----------------------------------------------------');
    console.log('[MOCK EMAIL] Sending email to:', options.email);
    console.log('[MOCK EMAIL] Subject:', options.subject);
    console.log('[MOCK EMAIL] Content (truncated):', options.html ? options.html.substring(0, 100) + '...' : '');
    console.log('----------------------------------------------------');
    return Promise.resolve(true);
};

const sendEmailFixed = async (options) => {
    console.log('----------------------------------------------------');
    console.log('[MOCK EMAIL] Sending email to:', options.email);
    console.log('[MOCK EMAIL] Subject:', options.subject);
    console.log('[MOCK EMAIL] Content (truncated):', options.html ? options.html.substring(0, 100) + '...' : '');
    console.log('----------------------------------------------------');
    return Promise.resolve(true);
};

module.exports = sendEmailFixed;
