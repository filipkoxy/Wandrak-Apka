
var wandrakDB = {};
var DB_ITEM_CNT_KEY = "offlineItemCnt";
var DB_ITEM_PREFIX_KEY = "offlineItemCnt";

function db_canStoreToServer() {
	return navigator.network.connection.type != Connection.NONE;
}

function db_storeItem(itemStr) {
	var itemCnt = window.localStorage.getItem(DB_ITEM_CNT_KEY);

	if (!itemCnt) {
		window.localStorage.setItem(DB_ITEM_CNT_KEY, 0);
		itemCnt = window.localStorage.getItem(DB_ITEM_CNT_KEY);
	}

	window.localStorage.setItem(DB_ITEM_PREFIX_KEY + itemCnt, 0);
	itemCnt++;
	window.localStorage.setItem(DB_ITEM_CNT_KEY, itemCnt);
}

function db_readItems() {
	var items = [];

	var itemCnt = window.localStorage.getItem(DB_ITEM_CNT_KEY);
	if (itemCnt) {
		for (int i=0; i < itemCnt; i++) {
			items.push(window.localStorage.getItem(DB_ITEM_PREFIX_KEY + i));
		}
	}

	return items;
}

function db_clearData() {
	var itemCnt = window.localStorage.getItem(DB_ITEM_CNT_KEY);
	window.localStorage.removeItem(DB_ITEM_CNT_KEY);
	if (itemCnt) {
		for (int i=0; i < itemCnt; i++) {
			window.localStorage.removeItem(DB_ITEM_PREFIX_KEY + i);
		}
	}
}

function db_trySendItems(finish_callback) {
	var items = db_readItems();

	if (!db_canStoreToServer()) {
		db_message("Internet not available. Stored locally for future upload.");
		return;
	}

	db_sendItemRecc({ items: items, pos: 0, finish_callback: finish_callback });
}

function db_sendItemRecc(statusObj) {
	if (statusObj.items.length > statusObj.pos) {
		var item = statusObj.items[statusObj.pos];

		$.ajax({
		    url: item.url,
		    type: 'GET',
		    dataType: 'json',
		    success: function (data) {
		    	if (data.status == 'ok') {
		    		statusObj.pos = statusObj.pos + 1;
		    		setTimeout(function(){ db_sendItemRecc(statusObj) }, 10);
		    		return;
		    	}
				db_message('Failed to store data!');
				if (statusObj.finish_callback) {
					statusObj.finish_callback();
				}
		    },
		    error: function () {
				db_message('Failed to store data!');
				if (statusObj.finish_callback) {
					statusObj.finish_callback();
				}
		    }
		});
	} else {
		if (statusObj.finish_callback) {
			statusObj.finish_callback();
		}
	}
}

function db_message(msg) {
	$(".msg_box").show();
	$(".msg_box").html(msg);
	setTimeout(function(){ $(".msg_box").hide(); }, 13000);
}
