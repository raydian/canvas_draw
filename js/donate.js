var itemID = "Screenshots";

Controller();

// Method called after unlocking or clicking already donated
function afterUnlock() {
	localStorage["removeHeaderFooter"] = "true";
}

var bg = chrome.extension.getBackgroundPage();
var minimumDonation = 1; // but being set overwritten when donate buttons are clicked
var currencySymbol = "$";
var currencyCode;
// If atleast 2 then we have multiple currencies
var multipleCurrencyFlag = getMessage("currencyCode2");
var donateButtonClicked = null;
var paypalInlineTimer;
var extensionName = getMessage("nameNoTM");

if (!extensionName) {
	try {
		extensionName = chrome.runtime.getManifest().name;
	} catch (e) {
		console.error("Manifest has not been loaded yet: " + e);
	}
	
	var prefix = "__MSG_";
	// look for key name to message file
	if (extensionName && extensionName.match(prefix)) {
		var keyName = extensionName.replace(prefix, "").replace("__", "");
		extensionName = getMessage(keyName);
	}
}

function getMessageFromCurrencySelection(key) {
	var idx = document.getElementById("multipleCurrency").selectedIndex;
	var suffix = idx == 0 ? "" : idx+1;
	return getMessage(key + suffix);
}

function initCurrency() {
	$("#multipleCurrency").find("option").each(function (idx) {
		// TWD is not supported for alertPay so disable it (dont' remove it because the selector uses it's order in the list)
		if (donateButtonClicked == "alertPay" && window.navigator.language.match(/tw/i) && $(this).attr("value") == "TWD") {
			$(this).attr("disabled", "true");
			if (idx==0) {
				$("#multipleCurrency").get(0).selectedIndex=1;
			}
		} else {
			$(this).removeAttr("disabled");
		}
	});
	
	if (donateButtonClicked == "paypal") {
		currencyCode = getMessageFromCurrencySelection("currencyCode");
		currencySymbol = getMessageFromCurrencySelection("currencySymbol");

		if (isEligibleForReducedDonation()) {
			minimumDonation = parseFloat(getMessageFromCurrencySelection("minimumDonationPaypalReduced"));
		} else {			
			minimumDonation = parseFloat(getMessageFromCurrencySelection("minimumDonation"));
		}

		// General
		$("#currencyCode").text(currencyCode);
		$("#currencySymbol").text(currencySymbol);				
		if (multipleCurrencyFlag) {
			$("#singleCurrencyWrapper").hide();
			$("#multipleCurrencyWrapper").show();
		}
	} else {
		currencySymbol = getMessage("currencySymbolForGoogleCheckout");
		if (isEligibleForReducedDonation()) {
			minimumDonation = parseFloat(getMessageFromCurrencySelection("minimumDonationGoogleCheckoutReduced"));
		} else {			
			minimumDonation = parseFloat(getMessage("minimumDonationForGoogleCheckout"));
		}
		
		$("#currencyCode").text(currencyCode);
		$("#currencySymbol").text(currencySymbol);
		$("#singleCurrencyWrapper").show();
		$("#multipleCurrencyWrapper").hide();
	}
}

function showDonationInput(buttonClicked) {
	donateButtonClicked = buttonClicked;
	$('#donateAmountDiv').slideUp("fast", function() {
		initCurrency();
	}).slideDown();
	$("#amount").focus();
}

function processFeatures() {
	localStorage["donationClicked"] = "true";
	localStorage["removeDonationLink"] = "true";
	if (typeof afterUnlock != "undefined") {
		afterUnlock();
	}
}

function initPaymentDetails(buttonClicked) {
	donateButtonClicked = buttonClicked;
	if (licenseType == "singleUser") {
		$('#donateAmountDiv').slideUp("fast", function() {
			initCurrency();
		}).slideDown();
		$("#amount").focus();
	} else {
		initCurrency();
		licenseSelected = $("#licenseOptions input:checked").data("data"); 
		var price = licenseSelected.price;
		initPaymentProcessor(price);
	}
}

function setPayPayInlineParam(params) {
	var didNotExist = false;
	var $inputNode = $("#paypapInlineForm input[name='" + params.name + "']");			
	if (!$inputNode.exists()) {
		didNotExist = true;
		$inputNode = $("<input type='hidden' name='" + params.name + "'/>");
	}
	$inputNode.val(params.value);
	if (didNotExist) {
		$("#paypapInlineForm").append($inputNode);
	}
}

// response from php so just set this and quit and wait for parent to read the localstorage
if (location.href.match(/paypalInline=fail|paypalInline=success/)) {
	localStorage["paypalInlineResponse"] = location.href;
	
	$(document).ready(function() {
		$("body").empty();
	});
	chrome.tabs.getCurrent(function(tab) {
		chrome.tabs.remove(tab.id);
	});
	window.close();
	
	return;
}

// reset paypal response
localStorage["paypalInlineResponse"] = "";

setInterval(function() {
	if (location.href.match(/paypalInline=fail|paypalInline=success/) || localStorage["paypalInlineResponse"]) {
		
		var success = location.href.match("success") || (localStorage["paypalInlineResponse"] && localStorage["paypalInlineResponse"].match("success"));
		
		// reset so we don't loop back here with the interval
		history.replaceState({}, 'After paypayInline', location.href.replace(/#.*/, "#paypayInline=acknowledged"));
		localStorage["paypalInlineResponse"] = "";
		
		if (dg && dg.isOpen()) {
			dg.closeFlow();
		}
		
		if (success) {
			showSuccessfulPayment();
			
			if (currencyCode == "USD") {
				var amount = getAmountNumberOnly();
				sendGA(['_trackEvent', "paypal", "success", "amount", amount]);
			} else {
				sendGA(['_trackEvent', "paypal", "success"]);
			}
		} else {
			$("#paymentFailure").text(getMessage("failureWithPayPalPurchase")).slideDown("slow").delay(6000).slideUp("slow");
			sendGA(['_trackEvent', "paypal", "cancel?"]);
		}
	}
}, 500);

function getAmountNumberOnly() {
	var amount = $("#amount").val();
	amount = amount.replace(",", ".");
	amount = amount.replace("$", "");
	return amount;
}

function showSuccessfulPayment() {		
	processFeatures();
	$(".alreadyDonated").hide();
	$("#thankYouVideo").attr("src", "http://www.youtube.com/embed/b_v-42FxDuY?rel=0&autoplay=1&showinfo=0&theme=light");
	$("#extraFeatures").slideUp("slow");
	$("#paymentOptions").slideUp("slow", function() {
		$("#paymentComplete").slideDown();
	});
}

function showPaymentMethods(licenseType) {
	window.licenseType = licenseType;
	$("#choosePaymentWrapper").slideUp("fast", function() {
		$("#choosePaymentWrapper").slideDown();
	});
}

function initPaymentProcessor(price) {
	if (donateButtonClicked == "paypal") {
		sendGA(['_trackEvent', "paypal", 'start']);
		
		$("#paypapInlineForm").attr("action", Controller.FULLPATH_TO_PAYMENT_FOLDERS + "paypalInline/setExpressCheckout.php");
		setPayPayInlineParam({name:"name",value:extensionName});
		setPayPayInlineParam({name:"price",value:price});
		setPayPayInlineParam({name:"currencyCode",value:currencyCode});
		//setPayPayInlineParam({name:"email",value:bg.email}); // Used only in case of errors to find who get the error
		
		var paramsToPassToSuccess = "&googleEmail=" + encodeURIComponent("") + "&itemID=" + encodeURIComponent(itemID);
		if (licenseType == "multipleUsers") {
			paramsToPassToSuccess += "&license=" + encodeURIComponent(licenseSelected.number);
		}
		
		setPayPayInlineParam({name:"successURL",value:Controller.FULLPATH_TO_PAYMENT_FOLDERS + "paypalInline/success.php?referer=" + encodeURIComponent(location.href) + paramsToPassToSuccess});
		setPayPayInlineParam({name:"cancelURL",value:Controller.FULLPATH_TO_PAYMENT_FOLDERS + "paypalInline/fail.php?referer=" + encodeURIComponent(location.href)});		
		
		$("#submitBtn").click();
		
		// Patch to avoid empty white space, hide frame initially
		var $paypalFrame = $("iframe[name=PPDGFrame]");
		$paypalFrame.hide();
		setTimeout(function() {
			$paypalFrame.fadeIn();
		}, 800);
	} else {
		sendGA(['_trackEvent', "inAppPayment", 'start']);
		
		var licenseParamValue = "";
		if (licenseType == "multipleUsers") {
			licenseParamValue = licenseSelected.number;
		}

		var dataToGenerateJWT = {name:extensionName, itemID:itemID, currencyCode:currencyCode, price:price, email:"", license:licenseParamValue};
		$.ajax({
			type: "GET",
			url: Controller.FULLPATH_TO_PAYMENT_FOLDERS + "googleCheckoutInline/generateJWTJSON.php",
			data: dataToGenerateJWT,
			dataType: "jsonp",
			jsonp: "jsoncallback",
			timeout: 5000,
			success: function(data, textStatus, jqXHR) {
				
				if (typeof google == "undefined") {
					alert("Please wait a few seconds for Google Wallet to load and then click here again!");
					return;
				}

				google.payments.inapp.buy({
					'jwt'     : data.token,
					'success' : function(result) {
						showSuccessfulPayment();
						sendGA(['_trackEvent', "inAppPayment", "success", "daysElapsedSinceFirstInstalled", daysElapsedSinceFirstInstalled()]);
					},
					'failure' : function(result) {
						logError("failure", result);
						if (result && result.response) {
							if (result.response.errorType == "PURCHASE_CANCELED") {
								$("#paymentFailure").html(getMessage("canceledInAppPurchase") + "<a href='http://jasonsavard.com/contact'>jasonsavard.com/contact</a>").slideDown("slow").delay(9000).slideUp("slow");
								sendGA(['_trackEvent', "inAppPayment", 'cancel?']);													
							} else {
								/*
									MERCHANT_ERROR - purchase request contains errors such as a badly formatted JWT
									PURCHASE_CANCELED - buyer canceled purchase or declined payment
									POSTBACK_ERROR - failure to acknowledge postback notification
									INTERNAL_SERVER_ERROR - internal Google error
								*/
								$("#paymentFailure").text(getMessage("failureWithInAppPurchase")).slideDown("slow").delay(3000).slideUp("slow");
								sendGA(['_trackEvent', "inAppPayment", 'failure']);
								Controller.email({subject:"Payment error", message:"request:<br>" + JSON.stringify(dataToGenerateJWT) + "<br><br>response:<br>" + JSON.stringify(result)});
							}								
						} else {
							$("#paymentFailure").text(getMessage("failureWithInAppPurchase")).slideDown("slow").delay(3000).slideUp("slow");
							sendGA(['_trackEvent', "inAppPayment", 'failure']);
							Controller.email({subject:"Payment error", message:"request:<br>" + JSON.stringify(dataToGenerateJWT) + "<br><br>response:<br>" + JSON.stringify(result)});
						}
					}
				});
			},
			error: function(jqXHR, textStatus, errorThrown) {
				alert("Temporary problem with this payment method, please try again later or try PayPal instead or contact the developer");
				sendGA(['_trackEvent', "inAppPayment", 'error with generateJWT']);
				Controller.email({subject:"Payment error", message:"generateJWT request:<br>" + JSON.stringify(dataToGenerateJWT) + "<br><br>response:<br>" + textStatus});
			}
		});
	}
}

function showAmountError(msg) {
	$("#amountError").html(msg).slideDown().delay(2000).slideUp();
}

function initLicenseFlow(email) {
	bg.email = email;
	$("#licenseDomain").text("@" + bg.email.split("@")[1]);
	//var licenses = [{number:"5", price:"0.02"}, {number:"10", price:"20"}, {number:"20", price:"40"}, {number:"unlimited", price:"0.03"}];
	var licenses = [{number:"5", price:"10"}, {number:"10", price:"20"}, {number:"20", price:"50"}, {number:"100", price:"100"}, {number:"unlimited", price:"500"}];
	$("#licenseOptions").empty();
	$.each(licenses, function(index, license) {
		var li = $("<li><input id='licenseOption" + index + "' type='radio' name='licenseOption'/>&nbsp;<label for='licenseOption" + index + "'>" + license.number + " users for USD $" + license.price + "</label></li>");
		li.find("input").data("data", license);
		$("#licenseOptions").append(li);
	});						
	$("#multipleUserLicenseWrapper").slideDown();
}

$(document).ready(function() {
	$("title, #title").text(extensionName);
	
	var action = getUrlValue(location.href, "action");
	var GOOGLE_CHECKOUT_BUTTON_SRC = "https://checkout.google.com/buttons/checkout.gif?merchant_id=458201642384573&w=160&h=43&style=trans&variant=text&loc=en_US";
	
	if (action) {
		setTimeout(function() {
			$("#extraFeaturesDetails").slideDown(2000);
		}, 800);
		setTimeout(function() {
			$("#paymentOptions").fadeIn(3500, function() {
				$("#donateButtonGoogleCheckoutImage").attr("src", GOOGLE_CHECKOUT_BUTTON_SRC);
			});
			$(".alreadyDonated").fadeIn(1700);
		}, 3000);
	} else {
		$("#extraFeaturesLegend").text(getMessage("extraFeatures"));
		$("#extraFeaturesDetails").show();
		$("#paymentOptions").show();
		$("#donateButtonGoogleCheckoutImage").attr("src", GOOGLE_CHECKOUT_BUTTON_SRC);
		$(".alreadyDonated").show();
	}

	
	$("#paymentMethods a").click(function() {
		$("#paymentMethods").find("a").removeClass("selected");
		$(this).addClass("selected");
		$("#paymentFailure").hide();
	});

	// If multiple currencies load them
	$("#multipleCurrency").change(function() {
		initCurrency();
	});
	var multipleCurrencyNode = $("#multipleCurrency").get(0);
	for (var a=1; a<10; a++) {
		var suffix = a==1 ? "" : a + "";
		var currencyCode2 = getMessage("currencyCode" + suffix);
		if (currencyCode2) {
			var currencySymbol2 = getMessage("currencySymbol" + suffix);
			multipleCurrency.add(new Option(currencyCode2 + " " + currencySymbol2, currencyCode2), null);
		}
	}
	
	$("#donateButton").click(function() {
		initPaymentDetails("paypal");
	});
	
	$("#donateButtonGoogleCheckout").click(function() {
		initPaymentDetails("googleCheckout");
	});

	$("#submitDonationAmount").click(function() {				
		sendGA(['_trackEvent', "donationAmount", 'submitted', $("#amount").val()]);
		
		var amount = getAmountNumberOnly();
		
		if (amount == "") {
			showAmountError(getMessage("enterAnAmount"));
			$("#amount").focus();
		} else if (parseFloat(amount) < minimumDonation) {
			var minAmountFormatted = minimumDonation.toFixed(2).replace("\.00", "");
			showAmountError(getMessage("minimumAmount", currencySymbol + minAmountFormatted));
			$("#amount").val(minAmountFormatted).focus();
		} else {
			initPaymentProcessor(amount);
		}
	});
	$('#amount').keypress(function(event) {
		  if (event.keyCode == '13') {
			  $("#submitDonationAmount").click();
		  }
	});
	$("#moreFeatures").click(function() {
		$(this).hide();
		$(".moreFeatures").slideDown();
	});
	// Show non-english users message to help me translate
	if (!window.navigator.language.match(/en/i)) {
		$("#helpMeTranslate").show();
	}
	
	$("#reasonsToDonateLink").click(function() {
		//$(this).hide();
		$("#reasonsToDonate").slideToggle();
		$("#me").fadeTo(2000, 1.0);
	});			
	$(".alreadyDonated").click(function() {
		$(this).hide();
		//if (bg.email) {
			//$("#alreadyDonatedEmail").val(bg.email).attr("disabled", "true");					
		//}				
		$("#alreadyDonatedDiv").slideToggle();
	});
	$("#verifyAlreadyDonated").click(function() {
		if ($("#alreadyDonatedEmail").val() && $("#confirmationNumber").val().length >= 10) {
			processFeatures();
			alert("The information has been sent! If it passes validation, the features will be automatically unlocked later today!")
			$("#alreadyDonatedDiv").slideUp();
		} else {
			$(this).attr("disabled", "true");
			alert("Invalid information, please retry in 30 seconds");					
			setTimeout(function() {
				$("#verifyAlreadyDonated").removeAttr("disabled");
			}, 30000);
		}
		sendGA(['_trackEvent', "verifyAlreadyDonated", $("#confirmationNumber").val(), $("#alreadyDonatedEmail").val()]);
	});

	$("#contributeToContinue").click(function() {
		$("#option1").slideUp("slow");
		$("#multipleUserLicenseWrapper").slideUp();
		showPaymentMethods("singleUser");
	});

	$("#closeWindow").click(function() {
		getActiveTab(function(currentTab) {
			window.close();
			chrome.tabs.remove(currentTab.id);
		});
	});
	
	$(".signOutAndSignIn").click(function() {
		location.href = "https://mail.google.com/mail/?logout"; //%3Fcontinue%3D" + encodeURIComponent(location.href);
		// &il=true&zx=1ecpu2nnl1qyn
	});
	
	$("#reviews").click(function() {
		$(this).attr("href", "https://chrome.google.com/webstore/detail/" + getExtensionIDFromURL(location.href) + "/reviews");
	});

	$("#closeReasonsToDonate").click(function() {
		$('#reasonsToDonate').slideUp();
	});

	// load these things at the end
	
	$.getScript("https://www.paypalobjects.com/js/external/dg.js", function(data, textStatus, jqxhr) {
		dg = new PAYPAL.apps.DGFlow({trigger:"submitBtn"});
	});		

});