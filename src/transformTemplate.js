/**
* Transform the text of the header or footer template, replacing the following supported placeholders:
*
* - `%%ISO-DATETIME%%` – For an ISO-based date and time format: `YYYY-MM-DD hh:mm:ss`
* - `%%ISO-DATE%%` – For an ISO-based date format: `YYYY-MM-DD`
* - `%%ISO-TIME%%` – For an ISO-based time format: `hh:mm:ss`
*/
export function transformTemplate(templateText) {
 if (templateText.indexOf('%%ISO-DATETIME%%') !== -1) {
   templateText = templateText.replace('%%ISO-DATETIME%%', new Date().toISOString().substr(0, 19).replace('T', ' '));
 }

 if (templateText.indexOf('%%ISO-DATE%%') !== -1) {
   templateText = templateText.replace('%%ISO-DATE%%', new Date().toISOString().substr(0, 10));
 }

 if (templateText.indexOf('%%ISO-TIME%%') !== -1) {
   templateText = templateText.replace('%%ISO-TIME%%', new Date().toISOString().substr(11, 8));
 }

 return templateText;
}