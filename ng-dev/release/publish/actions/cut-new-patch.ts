/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {semverInc} from '../../../utils/semver.js';
import {ActiveReleaseTrains} from '../../versioning/active-release-trains.js';
import {ReleaseAction} from '../actions.js';

/**
 * Release action that cuts a new patch release for the current latest release-train version
 * branch (i.e. the patch branch). The patch segment is incremented. The changelog is generated
 * for the new patch version, but also needs to be cherry-picked into the next development branch.
 */
export class CutNewPatchAction extends ReleaseAction {
  private _previousVersion = this.active.latest.version;
  private _newVersion = semverInc(this._previousVersion, 'patch');

  override async getDescription() {
    const {branchName} = this.active.latest;
    const newVersion = this._newVersion;
    return `Cut a new patch release for the "${branchName}" branch (v${newVersion}).`;
  }

  override async perform() {
    const {branchName} = this.active.latest;
    const newVersion = this._newVersion;
    const compareVersionForReleaseNotes = this._previousVersion;

    const {pullRequest, releaseNotes, builtPackagesWithInfo, beforeStagingSha} =
      await this.checkoutBranchAndStageVersion(
        newVersion,
        compareVersionForReleaseNotes,
        branchName,
      );

    await this.waitForPullRequestToBeMerged(pullRequest);
    await this.publish(builtPackagesWithInfo, releaseNotes, beforeStagingSha, branchName, 'latest');
    await this.cherryPickChangelogIntoNextBranch(releaseNotes, branchName);
  }

  static override async isActive(active: ActiveReleaseTrains) {
    // Patch versions can be cut at any time. See:
    // https://hackmd.io/2Le8leq0S6G_R5VEVTNK9A#Release-prompt-options.
    return true;
  }
}
