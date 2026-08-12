-- Rename the default business name from Marvin Coffee Spot to Vybz.

alter table business_settings alter column business_name set default 'Vybz';

update business_settings
set business_name = 'Vybz'
where business_name = 'Marvin Coffee Spot';
