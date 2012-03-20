/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */
/*
 * A very simple GNOME Shell extension that adds a "restart shell"
 * function to the user's menu, with a confirmation dialog.
 * Copyright (C) 2012  Andrea Santilli <andresantilli gmx com>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301,
 * USA.
 */

const Clutter       = imports.gi.Clutter;
const Gio           = imports.gi.Gio;
const GLib          = imports.gi.GLib;
const Lang          = imports.lang;
const Main          = imports.ui.main;
const ModalDialog   = imports.ui.modalDialog;
const PopupMenu     = imports.ui.popupMenu;
const St            = imports.gi.St;

const LOCALE_SUBDIR = 'locale';

const SHELL_RESTART = "Restart Shell...";
const CANCEL_BTN    = "Cancel";
const RELOAD_BTN    = "Reload theme only";
const RESTART_BTN   = "Restart";
const RELOADED_MSG  = "Theme reloaded";
const TITLE         = "Restart the GNOME Shell";
const DESCRIPTION   = "This action will restart the GNOME Shell.\n\
Do you really wish to do so?";

function ShellRestartMenuItem() {
    this._init.apply(this, arguments);
}

ShellRestartMenuItem.prototype = {
    __proto__: PopupMenu.PopupMenuItem.prototype,

    _init: function(metadata, params)
    {
        let statusMenu;
        let children;
        let index, i;

        PopupMenu.PopupMenuItem.prototype._init.call(this, _(SHELL_RESTART));

        statusMenu = Main.panel._statusArea.userMenu;
        children = statusMenu.menu._getMenuItems();
        index = children.length;

        /* this item looks for the "lock screen" entry and puts itself right
         * above it, otherwise it goes to the bottom of the usermenu */
        for (i = index - 1; i >= 0; i--) {
            if (children[i] == statusMenu._lockScreenItem) {
                index = i;
                break;
            }
        }
        statusMenu.menu.addMenuItem(this, index);

        this.connect('activate', Lang.bind(this, function () {
            Main.overview.hide();
            new ShellRestartConfirmDialog().open();
        }));
    },

    destroy: function() {
        this.actor._delegate = null;
        this.actor.destroy();
        this.actor.emit('destroy');
    }
};

function ShellRestartConfirmDialog() {
    this._init.apply(this, arguments);
}

/* let's use the same layout of the logout dialog */
ShellRestartConfirmDialog.prototype = {
    __proto__: ModalDialog.ModalDialog.prototype,
    
    _init: function(metadata, params) {
        let contents, msgbox;
        let subject, description;

        ModalDialog.ModalDialog.prototype._init.call(this,
            { styleClass: 'end-session-dialog' });

        msgbox = new St.BoxLayout({ vertical: true });
        this.contentLayout.add(msgbox, { y_align: St.Align.START });

        subject = new St.Label({
            style_class: 'end-session-dialog-subject',
            text: _(TITLE)
        });
        msgbox.add(subject, { y_fill:  false, y_align: St.Align.START });

        description = new St.Label({
            style_class: 'end-session-dialog-description',
            text: _(DESCRIPTION)
        });
        msgbox.add(description, { y_fill:  true, y_align: St.Align.START });

        /* keys won't work in the dialog until bug #662493 gets fixed */
        this.setButtons([{
            label: _(CANCEL_BTN),
            action: Lang.bind(this, function() {
                this.close();
            }),
            key: Clutter.Escape
        }, {
            label: _(RELOAD_BTN),
            action: Lang.bind(this, function() {
                this.close();
                Main.loadTheme();
                Main.notify(_(RELOADED_MSG));
            })
        }, {
            label: _(RESTART_BTN),
            action: Lang.bind(this, function() {
                this.close();
                global.reexec_self();
            })
        }]);
    }
};

let srmi;
let Gettext;
let _;

function init_localizations(metadata) {
    let data_dirs = new Array(metadata.path);
    data_dirs = data_dirs.concat(GLib.get_system_data_dirs());

    /* I prefer to fetch the uuid from the metadata instead of hardcoding it */
    Gettext = imports.gettext.domain(metadata.uuid);
    _ = Gettext.gettext;

    for (let i = 0; i < data_dirs.length; i++) {
        let dir = Gio.file_new_for_path(GLib.build_filenamev([ data_dirs[i],
                LOCALE_SUBDIR ]));

        if ((dir.query_exists(null)) && 
                (dir.query_file_type(Gio.FileQueryInfoFlags.NONE, null) ==
                Gio.FileType.DIRECTORY)) {
            imports.gettext.bindtextdomain(metadata.uuid, dir.get_path());
            imports.gettext.textdomain(metadata.uuid);
            break;
        }
    }
}

function init(metadata) {
    init_localizations(metadata);
}

function enable() {
    srmi = new ShellRestartMenuItem();
}

function disable() {
    srmi.destroy();
}
