$(function() {
	$('.shareBar .email').each(function() {
		var emailBtn = $(this);
		var url = emailBtn.attr('blogentryurl');

		var blogEntry = emailBtn.parents('.blogEntry');

		var subject = "Online Open! - " + blogEntry.find('.title').text();

		var body =
			"A blog entry from Online Open!\n" +
			"Read more at: ";

		emailBtn.attr('href', 'mailto:?subject=' + subject + '&body=' + encodeURIComponent(body) + url);
	});

	$('.blogEntryContentWrapper').each(function() {
		var blogEntryContentWrapper = $(this);
		var contentHeight = this.scrollHeight;
		var visibleHeight = blogEntryContentWrapper.outerHeight();

		if (contentHeight > visibleHeight) {
			blogEntryContentWrapper.find('.blogEntryReadMoreVeil').show();

			blogEntryContentWrapper.siblings('.readMoreButton').show();
		}
	});

	$('.readMoreButton').click(function() {
		$(this)
			.css('overflow', 'hidden')
			.animate({height: 0},
			{complete: function() {
				$(this).hide();
			}});
		var blogEntryContentWrapper = $(this).siblings('.blogEntryContentWrapper');
		var naturalheight = blogEntryContentWrapper[0].scrollHeight;
		blogEntryContentWrapper
			.animate({
				'max-height': naturalheight
			});
		blogEntryContentWrapper.children('.blogEntryReadMoreVeil').fadeOut();
		return false;
	});
});