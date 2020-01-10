$(function() {
	$('.shareBar .email').each(function() {
		var emailBtn = $(this);
		var url = emailBtn.attr('eventurl');

		var eventDiv = emailBtn.parents('.event');

		var subject = "Online Open! - " + eventDiv.find('.title').text();

		var body =
			"Event announced on Online Open!\n" +
			"Read more at: ";

		emailBtn.attr('href', 'mailto:?subject=' + subject + '&body=' + encodeURIComponent(body) + url);

	});
});