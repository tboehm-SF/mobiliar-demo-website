@isTest
private class MobiEmailNotificationTriggerTest {

    @isTest
    static void testWelcomeEmailTrigger() {
        Test.startTest();
        Mobi_Email_Notification__e evt = new Mobi_Email_Notification__e(
            Recipient_Email__c = 'test@example.com',
            Recipient_Name__c = 'Marc Baumgartner',
            Subject_Line__c = 'Willkommen bei der Mobiliar',
            Product__c = 'Autoversicherung'
        );
        Database.SaveResult sr = EventBus.publish(evt);
        System.assert(sr.isSuccess(), 'Failed to publish platform event: ' + sr.getErrors());
        Test.stopTest();
    }

    @isTest
    static void testMinimalFieldsTrigger() {
        Test.startTest();
        Mobi_Email_Notification__e evt = new Mobi_Email_Notification__e(
            Recipient_Email__c = 'minimal@example.com'
        );
        Database.SaveResult sr = EventBus.publish(evt);
        System.assert(sr.isSuccess(), 'Failed to publish platform event: ' + sr.getErrors());
        Test.stopTest();
    }

    @isTest
    static void testBlankEmailSkipped() {
        Test.startTest();
        Mobi_Email_Notification__e evt = new Mobi_Email_Notification__e(
            Recipient_Email__c = '',
            Recipient_Name__c = 'No Email User'
        );
        Database.SaveResult sr = EventBus.publish(evt);
        System.assert(sr.isSuccess(), 'Failed to publish platform event: ' + sr.getErrors());
        Test.stopTest();
    }

    @isTest
    static void testBuildBrandedEmail() {
        String html = MobiWelcomeEmailService.buildBrandedEmail('Test User', 'Autoversicherung');
        System.assert(html.contains('Herzlich willkommen'), 'Email should contain welcome greeting');
        System.assert(html.contains('Autoversicherung'), 'Email should contain product name');
        System.assert(html.contains('#da2323'), 'Email should contain Mobiliar brand color');
    }
}
