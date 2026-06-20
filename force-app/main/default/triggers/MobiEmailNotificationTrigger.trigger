trigger MobiEmailNotificationTrigger on Mobi_Email_Notification__e (after insert) {
    List<Messaging.SingleEmailMessage> emails = new List<Messaging.SingleEmailMessage>();

    for (Mobi_Email_Notification__e evt : Trigger.New) {
        String recipientEmail = evt.Recipient_Email__c;
        if (String.isBlank(recipientEmail)) continue;

        String recipientName = String.isNotBlank(evt.Recipient_Name__c) ? evt.Recipient_Name__c : 'Kundin / Kunde';
        String product = String.isNotBlank(evt.Product__c) ? evt.Product__c : 'Versicherung';
        String subjectLine = String.isNotBlank(evt.Subject_Line__c) ? evt.Subject_Line__c : 'Willkommen bei der Mobiliar';

        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setToAddresses(new String[]{ recipientEmail });
        mail.setSubject(subjectLine);
        mail.setSenderDisplayName('die Mobiliar');
        mail.setSaveAsActivity(false);
        mail.setHtmlBody(MobiWelcomeEmailService.buildBrandedEmail(recipientName, product));
        emails.add(mail);
    }

    if (!emails.isEmpty()) {
        Messaging.sendEmail(emails);
    }
}
