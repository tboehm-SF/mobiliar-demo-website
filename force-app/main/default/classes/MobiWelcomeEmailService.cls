@RestResource(urlMapping='/mobi/welcome-email')
global with sharing class MobiWelcomeEmailService {

    @HttpPost
    global static String sendWelcomeEmail() {
        RestRequest req = RestContext.request;
        Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(req.requestBody.toString());

        String toEmail = (String) body.get('email');
        String firstName = (String) body.get('firstName');
        String lastName = (String) body.get('lastName');
        String product = (String) body.get('product');

        if (String.isBlank(toEmail)) {
            RestContext.response.statusCode = 400;
            return '{"error":"email required"}';
        }

        String fullName = '';
        if (String.isNotBlank(firstName)) fullName = firstName;
        if (String.isNotBlank(lastName)) fullName += ' ' + lastName;
        fullName = fullName.trim();
        if (String.isBlank(fullName)) fullName = 'Kundin / Kunde';

        String productLabel = String.isNotBlank(product) ? product : 'Versicherung';

        String htmlBody = buildBrandedEmail(fullName, productLabel);

        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setToAddresses(new String[]{ toEmail });
        mail.setSubject('Willkommen bei der Mobiliar – Ihre ' + productLabel);
        mail.setSenderDisplayName('die Mobiliar');
        mail.setHtmlBody(htmlBody);

        try {
            Messaging.sendEmail(new Messaging.SingleEmailMessage[]{ mail });
            return '{"success":true,"message":"Email sent to ' + toEmail + '"}';
        } catch (Exception e) {
            RestContext.response.statusCode = 500;
            return '{"error":"' + e.getMessage().escapeJava() + '"}';
        }
    }

    global static String buildBrandedEmail(String name, String product) {
        return '<!DOCTYPE html>' +
        '<html lang="de"><head><meta charset="UTF-8"></head>' +
        '<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Inter,Helvetica Neue,Arial,sans-serif;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">' +
        '<tr><td align="center" style="padding:32px 16px;">' +
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">' +

        // Header
        '<tr><td style="background-color:#da2323;padding:28px 40px;text-align:center;">' +
        '<img src="https://tboehm-sf.github.io/mobiliar-demo-website/img/mobi-logo.svg" alt="die Mobiliar" width="180" style="display:inline-block;filter:brightness(0) invert(1);"></td></tr>' +

        // Greeting
        '<tr><td style="padding:40px 40px 16px;">' +
        '<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;color:#1a1a1a;font-weight:700;">Herzlich willkommen, ' + name.escapeHtml4() + '!</h1>' +
        '<p style="margin:0 0 24px;font-size:15px;color:#636363;line-height:1.5;">Sch\u00F6n, dass Sie sich f\u00FCr die Mobiliar interessieren.</p>' +
        '</td></tr>' +

        // Body
        '<tr><td style="padding:0 40px 24px;">' +
        '<p style="margin:0 0 16px;font-size:15px;color:#333333;line-height:1.7;">' +
        'Vielen Dank f\u00FCr Ihre Anfrage zur <strong>' + product.escapeHtml4() + '</strong>. ' +
        'Wir haben Ihre Angaben erhalten und werden Ihnen in K\u00FCrze ein individuelles Angebot zukommen lassen.</p>' +
        '<p style="margin:0 0 16px;font-size:15px;color:#333333;line-height:1.7;">' +
        'Eine pers\u00F6nliche Beraterin oder ein Berater Ihrer Generalagentur wird sich bei Ihnen melden, ' +
        'um die Details zu besprechen und die optimale L\u00F6sung f\u00FCr Sie zusammenzustellen.</p>' +
        '<p style="margin:0 0 24px;font-size:15px;color:#333333;line-height:1.7;">' +
        'Seit \u00FCber 200 Jahren steht die Mobiliar f\u00FCr N\u00E4he, Fairness und pers\u00F6nliche Beratung. ' +
        'Als Genossenschaft geh\u00F6ren wir unseren Versicherten \u2013 und setzen uns jeden Tag f\u00FCr Sie ein.</p>' +
        '</td></tr>' +

        // CTA
        '<tr><td style="padding:0 40px 32px;text-align:center;">' +
        '<a href="https://mobiliar-demo-website-c2e31c3b4575.herokuapp.com/" style="display:inline-block;background-color:#da2323;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:6px;font-size:15px;font-weight:600;font-family:Inter,Helvetica Neue,Arial,sans-serif;">Unsere Versicherungen entdecken</a>' +
        '</td></tr>' +

        // Divider
        '<tr><td style="padding:0 40px;"><div style="border-top:1px solid #e8e8e8;"></div></td></tr>' +

        // Contact
        '<tr><td style="padding:24px 40px 32px;">' +
        '<p style="margin:0 0 8px;font-size:14px;color:#636363;line-height:1.6;">' +
        '<strong style="color:#1a1a1a;">Fragen?</strong> Wir sind gerne f\u00FCr Sie da.</p>' +
        '<p style="margin:0;font-size:14px;color:#636363;line-height:1.6;">' +
        '\uD83D\uDCDE <span style="color:#da2323;font-weight:600;">0800 808 808</span> \u00B7 Mo\u2013Fr, 8\u201317 Uhr</p>' +
        '</td></tr>' +

        // Footer
        '<tr><td style="background-color:#1a1a1a;padding:24px 40px;text-align:center;">' +
        '<p style="margin:0 0 4px;font-size:12px;color:#b0b0b0;">\u00A9 2026 die Mobiliar \u2013 Demo</p>' +
        '<p style="margin:0;font-size:11px;color:#8c8c8c;">Nah. Pers\u00F6nlich. Fair.</p>' +
        '</td></tr>' +

        '</table></td></tr></table></body></html>';
    }
}
